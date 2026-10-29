export function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '');
}

export function todayInManila(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// Schedules are Philippine local times, regardless of the customer's time zone.
export function orientationStartsAt(orientation) {
  const date = String(orientation?.date || '').slice(0, 10);
  const time = String(orientation?.start_time || '').trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) return NaN;
  const calendarDay = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDay) || new Date(calendarDay).toISOString().slice(0, 10) !== date) return NaN;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (minute > 59 || second > 59) return NaN;
  if (match[4]) {
    if (hour < 1 || hour > 12) return NaN;
    hour = hour % 12 + (match[4].toUpperCase() === 'PM' ? 12 : 0);
  } else if (hour > 23) return NaN;
  return Date.parse(`${date}T${String(hour).padStart(2, '0')}:${match[2]}:${String(second).padStart(2, '0')}+08:00`);
}

export function remainingSlots(orientation) {
  return orientation.capacity === null ? null : Math.max(0, Number(orientation.capacity) - Number(orientation.reserved));
}

export function isBookableOrientation(orientation, now = new Date()) {
  return ['Open', 'Published'].includes(orientation?.status)
    && orientationStartsAt(orientation) > new Date(now).getTime()
    && Number(orientation.reserved) >= 0
    && (orientation.capacity === null || Number(orientation.reserved) < Number(orientation.capacity));
}
