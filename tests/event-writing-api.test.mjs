import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/event-writing.js';
import { authorizeEventRequest } from '../functions/_shared/event-auth.js';
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'test-public', BOXSOKU_SERVER_TOKEN: 'test-configured' };
const id = '11111111-1111-4111-8111-111111111111';
const headers = { Authorization: 'Bearer admin-test', 'Sec-Fetch-Site': 'same-origin', Referer: 'https://boxsoku.com/event-updates.html' };
const request = h => new Request(`https://boxsoku.com/api/event-writing?candidateId=${id}`, { headers: h });
const original = globalThis.fetch;
let reads = 0;
try {
  globalThis.fetch = async (url, init) => {
    assert.ok(!init.method || init.method === 'GET');
    reads++;
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: 'admin-id' });
    if (String(url).includes('/admin_users?')) return Response.json([{ user_id: 'admin-id' }]);
    if (String(url).includes('/event_update_candidates?')) return Response.json([{ candidate_id: id, normalized_data: { source_kind: 'discovery', bouts: [] } }]);
    throw new Error('unexpected request');
  };
  const response = await onRequestGet({ env, request: request(headers) });
  assert.equal(response.status, 200);
  assert.equal(reads, 3);
  assert.equal((await response.json()).packet.can_prepare_draft, false);
  reads = 0;
  assert.equal((await onRequestGet({ env, request: request({ ...headers, Origin: 'https://evil.example' }) })).status, 403);
  assert.equal(reads, 0);
  assert.equal((await authorizeEventRequest({ env, request: new Request('https://boxsoku.com/api/event-sync', { method: 'POST', headers }), allowServerToken: false })).status, 403);
} finally { globalThis.fetch = original; }
console.log('Writing endpoint authentication and read-only checks passed');
