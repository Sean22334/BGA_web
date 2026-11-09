export const CMS_FIELDS = {
  programs: { title: '', program_id: '', category: 'General', badge: 'Standard', short_description: '', duration: '', eligibility: '', image: '/images/culinary_lab.jpg', overview: '', highlights: [] },
  branches: { name: '', branch_key: '', address: '', phone: '', email: '', hours: '', map_url: '', image: '/images/hero_cruise_ship.jpg', features: [] },
  gallery: { title: '', category: 'Training', image: '' },
  testimonials: { name: '', role: '', company: '', quote: '', avatar: '', branch_tag: '' },
  faqs: { question: '', answer: '', faq_key: '', category: 'General' },
  stats: { stat_key: '', value: '', label: '', icon: 'Award' },
  partners: { name: '', logo_url: '' }
};

const REQUIRED = { programs: ['title'], branches: ['name'], gallery: ['title', 'image'], testimonials: ['name', 'quote'], faqs: ['question', 'answer'], stats: ['stat_key', 'value', 'label', 'icon'], partners: ['name'] };
export const published = (value) => [true, 1, '1', 'true'].includes(value);

export function cmsPayload(collection, input, { creating = false, uniqueId = () => globalThis.crypto.randomUUID() } = {}) {
  if (!Object.hasOwn(CMS_FIELDS, collection)) throw new Error('Unknown CMS collection.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Content must be an object.');
  const payload = {};
  for (const [field, fallback] of Object.entries(CMS_FIELDS[collection])) {
    const value = input[field] ?? (field === 'short_description' ? input.shortDescription : field === 'map_url' ? input.mapUrl : undefined) ?? fallback;
    if (Array.isArray(fallback)) {
      let list = value;
      if (typeof list === 'string') { try { list = JSON.parse(list); } catch { throw new Error(`${field} must be a list.`); } }
      if (!Array.isArray(list) || list.some((entry) => typeof entry !== 'string')) throw new Error(`${field} must be a list of text values.`);
      payload[field] = list;
    } else {
      if (typeof value !== 'string') throw new Error(`${field} must be text.`);
      payload[field] = value.trim();
    }
  }
  for (const field of REQUIRED[collection]) if (!payload[field]) throw new Error(`${field.replaceAll('_', ' ')} is required.`);
  const order = input.display_order ?? 0;
  if (!['string', 'number'].includes(typeof order) || String(order).trim() === '' || !Number.isSafeInteger(Number(order)) || Number(order) < 0 || Number(order) > 2147483647) throw new Error('Display order must be a nonnegative whole number.');
  payload.display_order = Number(order);
  if ('is_published' in input && ![true, false, 0, 1, '0', '1', 'true', 'false'].includes(input.is_published)) throw new Error('Published must be true or false.');
  payload.is_published = published(input.is_published);
  if (creating) {
    const key = { programs: 'program_id', branches: 'branch_key', faqs: 'faq_key' }[collection];
    if (key && !payload[key]) payload[key] = `${collection.slice(0, -1)}-${uniqueId()}`.slice(0, 50);
  }
  // Internal branch identity never changes when an existing location is renamed.
  if (!creating && collection === 'branches') delete payload.branch_key;
  for (const field of ['image', 'avatar', 'logo_url', 'map_url']) {
    const url = payload[field];
    if (url && !/^\/(?!\/)/.test(url)) {
      let parsed;
      try { parsed = new URL(url); } catch { throw new Error(`${field} must be a website URL or a local image path.`); }
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(`${field} must use HTTP or HTTPS.`);
    }
  }
  return payload;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function imageData(data) {
  const match = typeof data === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match || match[2].length % 4 !== 0) throw new Error('Choose a PNG, JPEG, GIF or WebP image.');
  if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('Image must be 5 MB or smaller.');
  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller.');
  const signatures = {
    png: binary.startsWith('\x89PNG\r\n\x1a\n'), jpeg: binary.startsWith('\xff\xd8\xff'),
    gif: binary.startsWith('GIF87a') || binary.startsWith('GIF89a'), webp: binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP'
  };
  if (!signatures[match[1]]) throw new Error('Image contents do not match its file type.');
  return { base64: match[2], mime: `image/${match[1]}`, extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}
