import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCmsContent, parseList, contactLinks } from '../src/lib/cmsContent.js';

test('empty published collections remain empty after normalization', () => {
  const content = normalizeCmsContent({ programs: [], partners: [], stats: [] });
  assert.deepEqual(content.programs, []);
  assert.deepEqual(content.partners, []);
  assert.equal('gallery' in content, false);
});

test('CMS JSON and legacy field names normalize safely', () => {
  const content = normalizeCmsContent({
    programs: [{ short_description: 'Summary', highlights: '["Valid", 1]', is_published: '0' }],
    branches: [{ features: 'invalid json', map_url: 'https://example.com/map' }],
    settings: { hero_trust_badges: 'invalid json' }
  });
  assert.deepEqual(content.programs[0].highlights, ['Valid']);
  assert.equal(content.programs[0].shortDescription, 'Summary');
  assert.equal(content.programs[0].is_published, false);
  assert.deepEqual(content.branches[0].features, []);
  assert.deepEqual(content.settings.hero_trust_badges, []);
  assert.deepEqual(parseList('{}'), []);
});

test('contact controls point to actual admissions communication channels', () => {
  const links = contactLinks({ contact_hotline: '+63 912 345 6789', contact_email: 'test@example.com', contact_facebook: 'https://www.facebook.com/bgapage' });
  assert.equal(links.telephone, 'tel:+639123456789');
  assert.equal(links.mail, 'mailto:test@example.com');
  assert.equal(links.messenger, 'https://m.me/bgapage');
});
