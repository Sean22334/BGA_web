const textEncoder = new TextEncoder();
const EXCEL_EPOCH = 25569;
const DAY_MS = 86_400_000;
const columns = [
  ['Ref Code', 'reference_number', 30, 'text'],
  ['Full Name', 'full_name', 26, 'text'],
  ['Phone', 'phone', 16, 'text'],
  ['Email', 'email', 32, 'text'],
  ['City', 'city', 20, 'text'],
  ['Branch', 'orientation_branch', 18, 'text'],
  ['Reservation Date', 'created_at', 23, 'dateTime'],
  ['Orientation Date', 'orientation_date', 18, 'date'],
  ['Status', 'status', 16, 'text']
];

function escapeXml(value) {
  return Array.from(String(value ?? ''), (character) => {
    const code = character.codePointAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32 ? character : '';
  }).join('')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function inlineCell(reference, value, style = '') {
  const text = escapeXml(value);
  return `<c r="${reference}" t="inlineStr"${style}><is><t${/^\s|\s$/.test(text) ? ' xml:space="preserve"' : ''}>${text}</t></is></c>`;
}

function excelDate(value, mode) {
  if (!value) return null;
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / DAY_MS + EXCEL_EPOCH;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)) / DAY_MS + EXCEL_EPOCH;
}

function numberCell(reference, value, style) {
  return value == null ? inlineCell(reference, '') : `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function header(length) { return new Uint8Array(length); }
function u16(bytes, offset, value) { new DataView(bytes.buffer).setUint16(offset, value, true); }
function u32(bytes, offset, value) { new DataView(bytes.buffer).setUint32(offset, value, true); }
function join(parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function zip(entries) {
  const files = entries.map(([name, content]) => ({ name: textEncoder.encode(name), content: textEncoder.encode(content) }));
  const local = [], central = [], offsets = [];
  let offset = 0;
  for (const file of files) {
    const crc = crc32(file.content), record = header(30);
    u32(record, 0, 0x04034B50); u16(record, 4, 20); u32(record, 14, crc); u32(record, 18, file.content.length); u32(record, 22, file.content.length); u16(record, 26, file.name.length);
    local.push(record, file.name, file.content); offsets.push(offset); offset += record.length + file.name.length + file.content.length;
  }
  let centralSize = 0;
  files.forEach((file, index) => {
    const record = header(46), crc = crc32(file.content);
    u32(record, 0, 0x02014B50); u16(record, 4, 20); u16(record, 6, 20); u32(record, 16, crc); u32(record, 20, file.content.length); u32(record, 24, file.content.length); u16(record, 28, file.name.length); u32(record, 42, offsets[index]);
    central.push(record, file.name); centralSize += record.length + file.name.length;
  });
  const end = header(22);
  u32(end, 0, 0x06054B50); u16(end, 8, files.length); u16(end, 10, files.length); u32(end, 12, centralSize); u32(end, 16, offset);
  return join([...local, ...central, end]);
}

function worksheet(rows) {
  const headerRow = columns.map(([label], index) => inlineCell(`${String.fromCharCode(65 + index)}1`, label, ' s="3"')).join('');
  const records = rows.map((row, rowIndex) => {
    const number = rowIndex + 2;
    return `<row r="${number}">${columns.map(([_, key, __, type], column) => {
      const reference = `${String.fromCharCode(65 + column)}${number}`;
      return type === 'text' ? inlineCell(reference, row[key]) : numberCell(reference, excelDate(row[key], type), type === 'dateTime' ? 1 : 2);
    }).join('')}</row>`;
  }).join('');
  const widths = columns.map(([_, __, width], index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths}</cols><sheetData><row r="1">${headerRow}</row>${records}</sheetData><autoFilter ref="A1:I${rows.length + 1}"/></worksheet>`;
}

export function reservationWorkbook(rows) {
  const sorted = [...rows].sort((left, right) => String(left.orientation_branch || '').localeCompare(String(right.orientation_branch || '')) || String(right.created_at || '').localeCompare(String(left.created_at || '')));
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reservations" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm AM/PM"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'],
    ['xl/worksheets/sheet1.xml', worksheet(sorted)]
  ]);
}
