import PDFDocument from 'pdfkit';

export interface PdfAcademicGradeRow {
  evaluationType: string;
  value: string;
  observation?: string | null;
}

export interface PdfAcademicSection {
  subjectName: string;
  rows: PdfAcademicGradeRow[];
  simpleAverage?: number | null;
}

export interface PdfKeyValueLine {
  label: string;
  value: string;
}

export interface PdfReportPayload {
  institutionName: string;
  title: string;
  metaLines: PdfKeyValueLine[];
  academicSections: PdfAcademicSection[];
  attendanceLines: PdfKeyValueLine[];
  observadorLines: PdfKeyValueLine[];
  footnotes: string[];
}

const PAGE_WIDTH = 595.28;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Generates an A4 PDF for an academic report / bulletin using PDFKit.
 * Standard WinAnsi (Latin-1) fonts are used, which cover Spanish accents.
 */
export function buildReportPdf(payload: PdfReportPayload): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderHeader(doc, payload);
    renderAcademicTable(doc, payload.academicSections);
    renderSummary(doc, 'Asistencia', payload.attendanceLines, true);
    renderSummary(doc, 'Observador del estudiante', payload.observadorLines, true);
    renderFootnotes(doc, payload.footnotes);

    doc.end();
  });
}

function renderHeader(doc: PDFKit.PDFDocument, payload: PdfReportPayload): void {
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#1e293b').text(payload.institutionName, { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(payload.title, { align: 'center' });
  doc.moveDown(0.2);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
  doc.moveDown(0.6);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
  const labelWidth = 140;
  for (const line of payload.metaLines) {
    const label = doc.widthOfString(`${line.label}:`);
    doc.text(`${line.label}:`, MARGIN, doc.y, { width: labelWidth, continued: true });
    doc.font('Helvetica').text(line.value, { continued: false });
    doc.font('Helvetica-Bold');
    void label;
    doc.moveDown(0.25);
  }
  doc.moveDown(0.5);
}

function renderAcademicTable(doc: PDFKit.PDFDocument, sections: PdfAcademicSection[]): void {
  if (sections.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text('No hay calificaciones registradas para el periodo seleccionado.');
    doc.moveDown(0.5);
    return;
  }

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Rendimiento académico');
  doc.moveDown(0.3);

  const colEvaluation = 210;
  const colValue = 90;
  const colObs = CONTENT_WIDTH - colEvaluation - colValue;

  for (const section of sections) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a').text(section.subjectName);
    doc.moveDown(0.15);

    if (section.rows.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Sin calificaciones.', { indent: 12 });
      doc.moveDown(0.2);
    } else {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b');
      doc.text('Evaluación', MARGIN + 12, doc.y, { width: colEvaluation, continued: true });
      doc.text('Calificación', { width: colValue, continued: true });
      doc.text('Observación', { width: colObs });
      doc.moveDown(0.1);

      for (const row of section.rows) {
        doc.font('Helvetica').fillColor('#334155');
        const y = doc.y;
        const observation = row.observation ?? '';
        const lines = doc.heightOfString(observation, { width: colObs - 6 });
        doc.text(row.evaluationType || '—', MARGIN + 12, y, { width: colEvaluation });
        doc.text(row.value, MARGIN + 12 + colEvaluation, y, { width: colValue });
        doc.text(observation, MARGIN + 12 + colEvaluation + colValue, y, { width: colObs - 6 });
        doc.y = y + Math.max(lines, doc.heightOfString('x', { width: colValue }));
        doc.moveDown(0.15);
      }
    }

    if (section.simpleAverage !== null && section.simpleAverage !== undefined && section.rows.length > 0) {
      doc.moveDown(0.1);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(
        `Promedio simple del período: ${section.simpleAverage.toFixed(2)}`,
        { indent: 12 },
      );
      doc.moveDown(0.1);
    }
    doc.moveDown(0.25);
  }
  doc.moveDown(0.5);
}

function renderSummary(
  doc: PDFKit.PDFDocument,
  title: string,
  lines: PdfKeyValueLine[],
  addTopSeparator: boolean,
): void {
  if (addTopSeparator) {
    doc.moveDown(0.4);
  }
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(title);
  doc.moveDown(0.25);
  if (lines.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text('Sin datos disponibles.');
  } else {
    for (const line of lines) {
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(line.label, MARGIN + 12, doc.y, { width: 260, continued: false });
      doc.x = MARGIN + 12 + 260;
      doc.text(line.value);
      doc.moveDown(0.15);
    }
  }
  doc.moveDown(0.3);
}

function renderFootnotes(doc: PDFKit.PDFDocument, footnotes: string[]): void {
  if (footnotes.length === 0) return;
  doc.moveDown(0.8);
  doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
  doc.moveDown(0.4);
  for (const note of footnotes) {
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#94a3b8').text(note, { width: CONTENT_WIDTH });
    doc.moveDown(0.15);
  }
}