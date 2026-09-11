import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { DocumentType, Prisma } from '@prisma/client';
import {
  ImportStudentsOptionsDto,
  ImportRowError,
  ImportStudentsResult,
} from './dto/import-students.dto';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const CSV_MIMES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
const XLSX_MIMES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

interface NormalizedRow {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  dateOfBirth: string;
  courseCode: string;
  status: string;
}

const HEADERS = [
  'firstname',
  'lastname',
  'documenttype',
  'documentnumber',
  'dateofbirth',
  'coursecode',
  'status',
] as const;

const HEADER_TO_KEY: Record<(typeof HEADERS)[number], keyof NormalizedRow> = {
  firstname: 'firstName',
  lastname: 'lastName',
  documenttype: 'documentType',
  documentnumber: 'documentNumber',
  dateofbirth: 'dateOfBirth',
  coursecode: 'courseCode',
  status: 'status',
};

@Injectable()
export class StudentsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private detectKind(file: Express.Multer.File): 'csv' | 'xlsx' {
    const name = (file.originalname ?? '').toLowerCase();
    if (name.endsWith('.xlsx') || XLSX_MIMES.includes(file.mimetype)) return 'xlsx';
    if (name.endsWith('.csv') || CSV_MIMES.includes(file.mimetype)) return 'csv';
    throw new BadRequestException('Unsupported file type. Upload a .csv or .xlsx file');
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      const v = value as
        ExcelJS.CellRichTextValue | ExcelJS.CellFormulaValue | ExcelJS.CellErrorValue;
      if ('richText' in v) return v.richText.map((t) => t.text).join('');
      if ('result' in v) return this.cellToString(v.result as ExcelJS.CellValue);
      if ('error' in v) return '';
    }
    return String(value).trim();
  }

  private async parseXlsx(buffer: Buffer): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    // exceljs typings expect an ArrayBuffer; a copy keeps runtime bytes intact.
    const bytes = Uint8Array.from(buffer);
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('The workbook has no worksheets');
    }
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      headers[col - 1] = this.cellToString(cell.value);
    });
    const records: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const rec: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const header = headers[col - 1];
        if (header) rec[header] = this.cellToString(cell.value);
      });
      if (Object.values(rec).every((v) => String(v ?? '').trim() === '')) return;
      records.push(rec);
    });
    return records;
  }

  private async parseRows(file: Express.Multer.File): Promise<Array<Partial<NormalizedRow>>> {
    const kind = this.detectKind(file);
    let records: Record<string, unknown>[];
    try {
      if (kind === 'csv') {
        records = parse(file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        }) as Record<string, unknown>[];
      } else {
        records = await this.parseXlsx(file.buffer);
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not parse the file. Verify headers and format');
    }

    return records.map((rec) => {
      const lowered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rec ?? {})) {
        lowered[key.trim().toLowerCase()] = typeof value === 'string' ? value : (value ?? '');
      }
      const row: Partial<NormalizedRow> = {};
      for (const h of HEADERS) {
        const v = lowered[h];
        if (v !== undefined && v !== null) row[HEADER_TO_KEY[h]] = String(v).trim();
      }
      return row;
    });
  }

  async importFromFile(
    institutionId: string,
    file: Express.Multer.File,
    options: ImportStudentsOptionsDto,
    userId: string,
    ipAddress?: string,
  ): Promise<ImportStudentsResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new BadRequestException('File exceeds the 5MB limit');
    }

    const rows = await this.parseRows(file);
    if (rows.length === 0) {
      throw new BadRequestException('The file contains no data rows');
    }

    const periodId = await this.resolveAcademicPeriod(institutionId, options.academicPeriodId);

    const courseCache = new Map<string, { id: string; schoolGradeId: string | null }>();
    const errors: ImportRowError[] = [];
    let created = 0;
    let enrollments = 0;

    const resolveCourse = async (
      rowIndex: number,
      courseCode: string | undefined,
    ): Promise<{ id: string; schoolGradeId: string | null } | null> => {
      const code = (courseCode ?? '').trim() || null;
      if (!code && options.courseId) {
        if (!courseCache.has(`id:${options.courseId}`)) {
          const course = await this.prisma.course.findFirst({
            where: { id: options.courseId, institutionId },
            select: { id: true, schoolGradeId: true },
          });
          if (!course) {
            errors.push({
              row: rowIndex,
              field: 'course',
              message: 'The default course does not exist',
            });
            return null;
          }
          courseCache.set(`id:${options.courseId}`, course);
        }
        return courseCache.get(`id:${options.courseId}`)!;
      }
      if (!code) {
        errors.push({
          row: rowIndex,
          field: 'course',
          message: 'Course is required (courseCode or default course)',
        });
        return null;
      }
      const key = `code:${code.toLowerCase()}`;
      if (!courseCache.has(key)) {
        const course = await this.prisma.course.findFirst({
          where: { institutionId, code },
          select: { id: true, schoolGradeId: true },
        });
        if (!course) {
          errors.push({ row: rowIndex, field: 'course', message: `Course ${code} does not exist` });
          return null;
        }
        courseCache.set(key, course);
      }
      return courseCache.get(key)!;
    };

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2; // header is row 1
      const row = rows[i];

      const firstName = (row.firstName ?? '').trim();
      const lastName = (row.lastName ?? '').trim();
      if (!firstName || !lastName) {
        errors.push({
          row: rowNumber,
          field: !firstName ? 'firstName' : 'lastName',
          message: 'First and last names are required',
        });
        continue;
      }

      const documentTypeRaw = (row.documentType ?? '').trim().toUpperCase();
      if (
        !documentTypeRaw ||
        !(Object.values(DocumentType) as string[]).includes(documentTypeRaw)
      ) {
        errors.push({
          row: rowNumber,
          field: 'documentType',
          message: `Invalid documentType (valid: ${(Object.values(DocumentType) as string[]).join(', ')})`,
        });
        continue;
      }
      const documentType = documentTypeRaw as DocumentType;

      const documentNumber = (row.documentNumber ?? '').trim();
      if (!documentNumber) {
        errors.push({
          row: rowNumber,
          field: 'documentNumber',
          message: 'documentNumber is required',
        });
        continue;
      }

      let dateOfBirth: Date | null = null;
      if (row.dateOfBirth) {
        const parsed = new Date(row.dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          errors.push({ row: rowNumber, field: 'dateOfBirth', message: 'Invalid date' });
          continue;
        }
        dateOfBirth = parsed;
      }

      const statusRaw = (row.status ?? '').trim().toUpperCase() || 'ACTIVE';
      if (statusRaw !== 'ACTIVE' && statusRaw !== 'INACTIVE') {
        errors.push({
          row: rowNumber,
          field: 'status',
          message: 'Invalid status (valid: ACTIVE, INACTIVE)',
        });
        continue;
      }

      if (!periodId) {
        errors.push({
          row: rowNumber,
          field: 'academicPeriod',
          message:
            'Academic period is required (provide academicPeriodId or keep a single ACTIVE period)',
        });
        continue;
      }

      const course = await resolveCourse(rowNumber, row.courseCode);
      if (!course) continue;
      if (!course.schoolGradeId) {
        errors.push({
          row: rowNumber,
          field: 'course',
          message: 'The course has no school grade assigned',
        });
        continue;
      }

      const duplicate = await this.prisma.student.findUnique({
        where: {
          institutionId_documentType_documentNumber: {
            institutionId,
            documentType,
            documentNumber,
          },
        },
        select: { id: true },
      });
      if (duplicate) {
        errors.push({
          row: rowNumber,
          field: 'documentNumber',
          message: 'A student with this document already exists',
        });
        continue;
      }

      try {
        const student = await this.prisma.student.create({
          data: {
            institutionId,
            firstName,
            lastName,
            documentType,
            documentNumber,
            dateOfBirth,
            status: statusRaw as 'ACTIVE' | 'INACTIVE',
          },
          select: { id: true },
        });
        await this.prisma.enrollment.create({
          data: {
            institutionId,
            studentId: student.id,
            courseId: course.id,
            schoolGradeId: course.schoolGradeId,
            academicPeriodId: periodId,
          },
        });
        created += 1;
        enrollments += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          errors.push({
            row: rowNumber,
            field: 'documentNumber',
            message: 'A student with this document already exists',
          });
        } else {
          errors.push({
            row: rowNumber,
            field: '-',
            message: 'Unexpected error processing the row',
          });
        }
      }
    }

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENTS_BULK_IMPORTED',
      entityType: 'Student',
      newValues: { created, enrollments, errorCount: errors.length, totalRows: rows.length },
      ipAddress,
    });

    return { created, updated: 0, enrollments, errors };
  }

  private async resolveAcademicPeriod(
    institutionId: string,
    explicitId?: string,
  ): Promise<string | null> {
    if (explicitId) {
      const period = await this.prisma.academicPeriod.findFirst({
        where: { id: explicitId, institutionId },
        select: { id: true },
      });
      return period ? period.id : null;
    }
    const active = await this.prisma.academicPeriod.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: { id: true },
    });
    return active.length === 1 ? active[0].id : null;
  }
}
