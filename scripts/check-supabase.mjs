import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const url = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');

// Read-only RPCs and empty selects: never inspect or create an applicant record.
const checks = [
  { label: 'confirmation RPC', path: '/rpc/lookup_reservation_confirmation', body: { p_reference_number: 'BGA-NONEXISTENT-SCHEMA-CHECK', p_phone: '0000000000' } },
  { label: 'start-time RPC', path: '/rpc/orientation_starts_at', body: { p_date: '2099-01-01', p_time: '09:00 AM' } },
  { label: 'public orientations', path: '/orientations?select=id&limit=0' },
  ...['programs', 'branches', 'gallery', 'testimonials', 'faqs', 'stats', 'partners'].map((name) => ({
    label: `CMS ${name}`, path: `/cms_${name}?select=id,is_published,display_order&limit=0`
  }))
];

for (const check of checks) {
  try {
    const response = await fetch(`${url}/rest/v1${check.path}`, {
      method: check.body ? 'POST' : 'GET',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(check.body ? { body: JSON.stringify(check.body) } : {}),
      signal: AbortSignal.timeout(15_000)
    });
    const data = await response.json();
    console.log(`${check.label}: ${response.ok ? 'available' : 'FAILED'} (HTTP ${response.status}${data?.code ? `, ${data.code}` : ''})`);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.error(`${check.label}: FAILED (service could not be reached)`);
    process.exitCode = 1;
  }
}
