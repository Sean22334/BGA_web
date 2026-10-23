export const CMS_COLLECTIONS = ['programs', 'branches', 'gallery', 'testimonials', 'faqs', 'stats', 'partners'];

export function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeCmsContent(data = {}) {
  const normalized = { settings: { ...data.settings } };
  for (const key of ['hero_trust_badges', 'about_why_items']) {
    if (key in normalized.settings) normalized.settings[key] = parseList(normalized.settings[key]);
  }
  for (const collection of CMS_COLLECTIONS) {
    // A successful empty collection is authoritative: never restore removed drafts or seed data.
    if (!Array.isArray(data[collection])) continue;
    normalized[collection] = data[collection].filter(Boolean).map((item) => {
      if (typeof item === 'string') return item;
      const row = { ...item };
      if ('is_published' in row) row.is_published = [true, 1, '1', 'true'].includes(row.is_published);
      if (collection === 'programs') {
        row.highlights = parseList(row.highlights).filter((value) => typeof value === 'string');
        row.shortDescription = row.short_description ?? row.shortDescription ?? '';
        row.fullDescription = row.full_description ?? row.fullDescription ?? '';
      }
      if (collection === 'branches') {
        row.features = parseList(row.features).filter((value) => typeof value === 'string');
        row.mapUrl = row.map_url ?? row.mapUrl ?? '';
      }
      return row;
    });
  }
  return normalized;
}

export function contactLinks(settings = {}) {
  const phone = settings.contact_hotline || '+63 956 483 9033';
  const email = settings.contact_email || 'bluechefglobalacademy@gmail.com';
  const facebook = settings.contact_facebook || 'https://www.facebook.com/bluechefglobalacademy';
  let messenger = facebook;
  try {
    const url = new URL(facebook);
    const page = url.pathname.split('/').filter(Boolean)[0];
    if (['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname) && page && page !== 'profile.php') {
      messenger = `https://m.me/${encodeURIComponent(page)}`;
    }
  } catch {
    messenger = 'https://m.me/bluechefglobalacademy';
  }
  return { phone, email, facebook, messenger, telephone: `tel:${phone.replace(/[^+\d]/g, '')}`, mail: `mailto:${email}` };
}
