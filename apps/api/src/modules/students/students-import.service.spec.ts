import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { StudentsImportService } from './students-import.service';
import { DocumentType } from '@prisma/client';

describe('StudentsImportService (GAP-3)', () => {
  let service: StudentsImportService;
  let prismaMock: {
    course: { findFirst: jest.Mock };
    academicPeriod: { findFirst: jest.Mock; findMany: jest.Mock };
    student: { findUnique: jest.Mock; create: jest.Mock };
    enrollment: { create: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const periodId = 'period-1';
  const courseId = 'course-1';

  const csvFile = (content: string, name = 'students.csv'): Express.Multer.File =>
    ({
      originalname: name,
      mimetype: 'text/csv',
      buffer: Buffer.from(content, 'utf8'),
      size: Buffer.byteLength(content),
    }) as Express.Multer.File;

  async function xlsxFile(rows: string[][]): Promise<Express.Multer.File> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    for (const row of rows) sheet.addRow(row);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      originalname: 'students.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
      size: buffer.length,
    } as Express.Multer.File;
  }

  beforeEach(() => {
    prismaMock = {
      course: { findFirst: jest.fn() },
      academicPeriod: { findFirst: jest.fn(), findMany: jest.fn() },
      student: { findUnique: jest.fn(), create: jest.fn() },
      enrollment: { create: jest.fn() },
    };
    auditServiceMock = { log: jest.fn() };
    service = new StudentsImportService(prismaMock as never, auditServiceMock as never);

    prismaMock.academicPeriod.findMany.mockResolvedValue([{ id: periodId }]);
    prismaMock.course.findFirst.mockResolvedValue({ id: courseId, schoolGradeId: 'grade-1' });
    prismaMock.student.findUnique.mockResolvedValue(null);
    prismaMock.student.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `s-${args.data.documentNumber}` }),
    );
    prismaMock.enrollment.create.mockResolvedValue({});
  });

  const header = 'firstName,lastName,documentType,documentNumber,dateOfBirth,courseCode,status';

  it('should import a valid CSV creating students and enrollments', async () => {
    const file = csvFile(
      `${header}\nAna,Torres,NATIONAL_ID,111,2015-01-01,2A,ACTIVE\nLuis,Pérez,DNI,222,,2A,`,
    );

    const result = await service.importFromFile(institutionId, file, {}, 'admin-1');

    expect(result.created).toBe(2);
    expect(result.enrollments).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual([]);
    expect(prismaMock.enrollment.create).toHaveBeenCalledTimes(2);
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STUDENTS_BULK_IMPORTED' }),
    );
  });

  it('should import a valid XLSX file', async () => {
    const file = await xlsxFile([
      [
        'firstName',
        'lastName',
        'documentType',
        'documentNumber',
        'dateOfBirth',
        'courseCode',
        'status',
      ],
      ['Marta', 'Ríos', 'NATIONAL_ID', '333', '2014-05-05', '2A', 'ACTIVE'],
    ]);

    const result = await service.importFromFile(institutionId, file, {}, 'admin-1');

    expect(result.created).toBe(1);
    expect(result.enrollments).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('should report per-row errors without stopping the import', async () => {
    prismaMock.course.findFirst.mockImplementation((args: { where: { code?: string } }) => {
      if (args.where.code === 'NOPE') return Promise.resolve(null);
      return Promise.resolve({ id: courseId, schoolGradeId: 'grade-1' });
    });
    prismaMock.student.findUnique.mockImplementation(
      (args: {
        where: { institutionId_documentType_documentNumber: { documentNumber: string } };
      }) => {
        if (args.where.institutionId_documentType_documentNumber.documentNumber === '999') {
          return Promise.resolve({ id: 'existing' });
        }
        return Promise.resolve(null);
      },
    );

    const file = csvFile(
      `${header}\n` +
        'Ok,Student,NATIONAL_ID,100,2015-01-01,2A,ACTIVE\n' +
        ',Missing,NATIONAL_ID,101,2015-01-01,2A,ACTIVE\n' +
        'Bad,Course,NATIONAL_ID,102,2015-01-01,NOPE,ACTIVE\n' +
        'Dup,Student,NATIONAL_ID,999,2015-01-01,2A,ACTIVE\n' +
        'Bad,Doc,BADTYPE,103,2015-01-01,2A,ACTIVE',
    );

    const result = await service.importFromFile(institutionId, file, {}, 'admin-1');

    expect(result.created).toBe(1);
    expect(result.enrollments).toBe(1);
    expect(result.errors).toHaveLength(4);
    expect(result.errors.map((e) => e.row)).toEqual([3, 4, 5, 6]);
    expect(result.errors.find((e) => e.row === 4)).toMatchObject({ field: 'course' });
    expect(result.errors.find((e) => e.row === 5)).toMatchObject({ field: 'documentNumber' });
    expect(result.errors.find((e) => e.row === 6)).toMatchObject({ field: 'documentType' });
  });

  it('should use the default courseId when rows lack courseCode', async () => {
    const file = csvFile(`${header}\nAna,Torres,NATIONAL_ID,111,2015-01-01,,ACTIVE`);

    const result = await service.importFromFile(institutionId, file, { courseId }, 'admin-1');

    expect(result.created).toBe(1);
    expect(prismaMock.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: courseId }) }),
    );
  });

  it('should error rows when the academic period cannot be resolved', async () => {
    prismaMock.academicPeriod.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const file = csvFile(`${header}\nAna,Torres,NATIONAL_ID,111,2015-01-01,2A,ACTIVE`);

    const result = await service.importFromFile(institutionId, file, {}, 'admin-1');

    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 2, field: 'academicPeriod' });
  });

  it('should reject files over 5MB', async () => {
    const file = csvFile(`${header}\nAna,Torres,NATIONAL_ID,111,,2A,ACTIVE`);
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    await expect(service.importFromFile(institutionId, file, {}, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject unsupported file types', async () => {
    const file = csvFile('a,b', 'students.pdf');
    (file as { mimetype: string }).mimetype = 'application/pdf';

    await expect(service.importFromFile(institutionId, file, {}, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject files without data rows', async () => {
    const file = csvFile(`${header}\n`);

    await expect(service.importFromFile(institutionId, file, {}, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should report an error when the course has no school grade', async () => {
    prismaMock.course.findFirst.mockResolvedValue({ id: courseId, schoolGradeId: null });
    const file = csvFile(`${header}\nAna,Torres,NATIONAL_ID,111,2015-01-01,2A,ACTIVE`);

    const result = await service.importFromFile(institutionId, file, {}, 'admin-1');

    expect(result.created).toBe(0);
    expect(result.errors[0]).toMatchObject({ field: 'course' });
  });

  it('should validate the DocumentType enum from the prisma model', () => {
    expect(Object.values(DocumentType)).toContain('NATIONAL_ID');
  });
});
