import { published } from './cmsRules.js';

export const UPDATE_CATEGORIES = { news: 'News', event: 'Events', announcement: 'Announcements' };
export const EMPTY_ARTICLE = { type: 'doc', content: [] };
export const PUBLISHING_KINDS = ['updates', 'alumni'];
export function contentUrl(value, { link = false } = {}) {
  if (typeof value !== 'string') return false;
  if (/^\/(?!\/)/.test(value) || (link && /^#[\w-]+$/.test(value))) return true;
  try { const url = new URL(value); return (link ? ['https:', 'http:', 'mailto:'] : ['https:', 'http:']).includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}

export function richText(input) {
  let value = input;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { throw new Error('Article content is invalid.'); } }
  let nodes = 0, characters = 0;
  function visit(node, depth = 0) {
    if (++nodes > 3000 || depth > 20 || !node || typeof node !== 'object' || Array.isArray(node)) throw new Error('Article content is too complex or invalid.');
    const allowed = { doc: ['paragraph', 'bulletList', 'orderedList'], paragraph: ['text', 'hardBreak'], bulletList: ['listItem'], orderedList: ['listItem'], listItem: ['paragraph', 'bulletList', 'orderedList'] };
    if (node.type === 'text') {
      if (typeof node.text !== 'string') throw new Error('Article text is invalid.');
      characters += node.text.length;
      if (characters > 100000) throw new Error('Article text must be 100,000 characters or shorter.');
      const marks = (node.marks || []).map((mark) => {
        if (['bold', 'italic'].includes(mark.type)) return { type: mark.type };
        if (mark.type === 'link' && contentUrl(mark.attrs?.href, { link: true })) return { type: 'link', attrs: { href: mark.attrs.href } };
        throw new Error('Article links must use HTTP, HTTPS, email or a local path.');
      });
      return { type: 'text', text: node.text, ...(marks.length ? { marks } : {}) };
    }
    if (node.type === 'hardBreak') return { type: 'hardBreak' };
    if (!Object.hasOwn(allowed, node.type) || !Array.isArray(node.content || [])) throw new Error('Article formatting is not supported.');
    const children = (node.content || []).map((child) => {
      if (!allowed[node.type].includes(child?.type)) throw new Error('Article structure is invalid.');
      return visit(child, depth + 1);
    });
    return { type: node.type, ...(node.type === 'orderedList' ? { attrs: { start: Number.isSafeInteger(node.attrs?.start) && node.attrs.start > 0 ? node.attrs.start : 1 } } : {}), content: children };
  }
  if (value?.type !== 'doc') throw new Error('Article content must be a document.');
  return visit(value);
}
export function articleText(node) {
  return node?.type === 'text' ? node.text : (node?.content || []).map(articleText).join(' ');
}

export function publishingPayload(kind, input) {
  if (!PUBLISHING_KINDS.includes(kind)) throw new Error('Unknown content collection.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Content must be an object.');
  const fields = kind === 'updates' ? { title: 255, category: 20, summary: 2000, cover_image: 500 } : { name: 255, image: 500, batch: 150, company: 255, position: 255 };
  const output = {};
  for (const [field, limit] of Object.entries(fields)) {
    const value = input[field] ?? (field === 'category' ? 'news' : '');
    if (typeof value !== 'string' || value.trim().length > limit) throw new Error(`${field.replaceAll('_', ' ')} must be text of ${limit} characters or fewer.`);
    output[field] = value.trim();
  }
  if ('is_published' in input && ![true, false, 1, 0, 'true', 'false', '1', '0'].includes(input.is_published)) throw new Error('Published must be true or false.');
  output.is_published = published(input.is_published);
  if (!(kind === 'updates' ? output.title : output.name)) throw new Error(kind === 'updates' ? 'Title is required.' : 'Name is required.');
  const imageField = kind === 'updates' ? 'cover_image' : 'image';
  if (output[imageField] && !contentUrl(output[imageField])) throw new Error('Choose a valid image URL or upload an image.');
  if (kind === 'updates') {
    if (!Object.hasOwn(UPDATE_CATEGORIES, output.category)) throw new Error('Choose News, Events or Announcements.');
    output.body_json = richText(input.body_json ?? EMPTY_ARTICLE);
    if (output.is_published && (!output.summary || !output.cover_image || !articleText(output.body_json).trim())) throw new Error('A summary, cover image and article body are required before publishing.');
  } else {
    const order = input.display_order ?? 0;
    if (!['number', 'string'].includes(typeof order) || String(order).trim() === '' || !Number.isSafeInteger(Number(order)) || Number(order) < 0 || Number(order) > 2147483647) throw new Error('Display order must be a nonnegative whole number.');
    output.display_order = Number(order);
    if (output.is_published && Object.keys(fields).some((key) => !output[key])) throw new Error('Picture, name, batch, company and position are required before publishing.');
  }
  return output;
}

export function publishingQuery(input = {}) {
  const page = Number(input.page ?? 1), pageSize = Number(input.pageSize ?? 12);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 12) throw new Error('Invalid content page.');
  const category = input.category || '', batch = input.batch || '';
  if (category && !Object.hasOwn(UPDATE_CATEGORIES, category)) throw new Error('Unknown update category.');
  if (typeof batch !== 'string' || batch.length > 150) throw new Error('Invalid batch filter.');
  return { page, pageSize, category, batch };
}

export function validateAboutSettings(settings) {
  if ('about_why_items' in settings) {
    let items = settings.about_why_items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch { throw new Error('Why Choose cards must be a list.'); } }
    if (!Array.isArray(items) || items.length > 30 || items.some((item) => !item || typeof item.title !== 'string' || !item.title.trim() || typeof item.desc !== 'string' || !item.desc.trim() || !['ShieldCheck', 'Building2', 'Anchor', 'Sparkles'].includes(item.icon))) throw new Error('Each Why Choose card needs a title, description and supported icon.');
  }
  if (published(settings.about_history_enabled) && !(typeof settings.about_history_body === 'string' && settings.about_history_body.trim())) throw new Error('Enter the academy history before enabling Our History.');
  if (settings.about_history_image && !contentUrl(settings.about_history_image)) throw new Error('Choose a valid history image URL or upload an image.');
}
