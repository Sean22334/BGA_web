export function moveMonth(month, offset) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function monthDays(month) {
  const [year, value] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, value - 1, 1));
  const start = first.getTime() - first.getUTCDay() * 86400000;
  return Array.from({ length: 42 }, (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10));
}
export function monthLabel(month) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00Z`));
}
