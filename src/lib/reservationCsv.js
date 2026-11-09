const columns = ['reference_number', 'full_name', 'phone', 'email', 'city', 'orientation_branch', 'orientation_date', 'status'];
function cell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reservationCsv(rows) {
  return '\uFEFF' + ['Ref Code,Full Name,Phone,Email,City,Branch,Date,Status', ...rows.map((row) => columns.map((key) => cell(row[key])).join(','))].join('\r\n');
}
