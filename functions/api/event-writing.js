import { authorizeEventRequest, configuredEventAutomation, jsonResponse, supabaseHeaders } from '../_shared/event-auth.js';
import { buildEventWritingPacket } from '../_shared/event-writing.js';

export async function onRequestGet({ env, request }) {
  if (!configuredEventAutomation(env)) return jsonResponse({ ok: false, message: '興行自動更新が未設定です。' }, 503);
  const auth = await authorizeEventRequest({ env, request, allowServerToken: false });
  if (!auth.ok) return jsonResponse({ ok: false, message: auth.message }, auth.status);
  const id = new URL(request.url).searchParams.get('candidateId') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return jsonResponse({ ok: false, message: '候補IDが不正です。' }, 422);
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/event_update_candidates?candidate_id=eq.${id}&select=*&limit=1`, { headers: supabaseHeaders(env, auth.token) });
    if (!response.ok) throw new Error('candidate_read_failed');
    const [candidate] = await response.json();
    if (!candidate) return jsonResponse({ ok: false, message: '候補がありません。' }, 404);
    return jsonResponse({ ok: true, packet: buildEventWritingPacket(candidate) });
  } catch { return jsonResponse({ ok: false, message: '執筆データを取得できませんでした。' }, 502); }
}
