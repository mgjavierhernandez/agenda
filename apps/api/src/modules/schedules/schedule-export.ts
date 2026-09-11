import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { DayOfWeek } from '@prisma/client';

export interface ScheduleExportRow {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  courseName: string;
  subjectName: string;
  classroomName: string;
  teacherName: string;
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const HEADERS = ['Día', 'Inicio', 'Fin', 'Curso', 'Asignatura', 'Aula', 'Docente'];

function rowToArray(r: ScheduleExportRow): string[] {
  return [
    DAY_LABELS[r.day] ?? r.day,
    r.startTime,
    r.endTime,
    r.courseName,
    r.subjectName,
    r.classroomName,
    r.teacherName,
  ];
}

export function buildScheduleCsv(rows: ScheduleExportRow[]): Buffer {
  const escape = (v: string): string =>
    /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [HEADERS.map(escape).join(',')];
  for (const r of rows) lines.push(rowToArray(r).map(escape).join(','));
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}

export async function buildScheduleXlsx(rows: ScheduleExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agenda Escolar Digital';
  const sheet = workbook.addWorksheet('Horario');
  sheet.columns = [
    { header: 'Día', key: 'day', width: 14 },
    { header: 'Inicio', key: 'start', width: 10 },
    { header: 'Fin', key: 'end', width: 10 },
    { header: 'Curso', key: 'course', width: 24 },
    { header: 'Asignatura', key: 'subject', width: 24 },
    { header: 'Aula', key: 'classroom', width: 18 },
    { header: 'Docente', key: 'teacher', width: 28 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    const [day, start, end, course, subject, classroom, teacher] = rowToArray(r);
    sheet.addRow({ day, start, end, course, subject, classroom, teacher });
  }
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

export function buildSchedulePdf(
  institutionName: string,
  title: string,
  rows: ScheduleExportRow[],
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text(institutionName, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title, { align: 'center' });
    doc.moveDown(0.5);

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text('No hay horarios en el alcance seleccionado.');
      doc.end();
      return;
    }

    const widths = [70, 55, 55, 140, 140, 100, 160];
    const startX = 40;
    const renderRow = (cells: string[], bold: boolean, y: number): number => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(bold ? '#0f172a' : '#334155');
      let maxH = doc.heightOfString('X', { width: 50 });
      const heights = cells.map((c, i) => doc.heightOfString(c || '—', { width: widths[i] - 6 }));
      maxH = Math.max(maxH, ...heights);
      let x = startX;
      cells.forEach((c, i) => {
        doc.text(c || '—', x + 3, y, { width: widths[i] - 6 });
        x += widths[i];
      });
      return y + maxH + 6;
    };

    let y = renderRow(HEADERS, true, doc.y);
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(startX, y - 3).lineTo(startX + widths.reduce((a, b) => a + b, 0), y - 3).stroke();
    for (const r of rows) {
      if (y > 520) {
        doc.addPage();
        y = 60;
        y = renderRow(HEADERS, true, y) + 4;
      }
      y = renderRow(rowToArray(r), false, y);
    }

    doc.end();
  });
}
