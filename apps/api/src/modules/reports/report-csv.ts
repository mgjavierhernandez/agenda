/**
 * Minimal CSV serializer (no external dependency) following RFC-4180-ish
 * quoting rules: fields containing a comma, quote, CR or LF are wrapped in
 * double quotes and embedded quotes are doubled. Uses CRLF row separators.
 */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): Buffer {
  const escapeField = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}