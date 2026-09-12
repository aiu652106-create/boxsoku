import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseSourceHtml } from '../functions/_shared/event-sources.js';
import { buildEventWritingPacket } from '../functions/_shared/event-writing.js';

export const CARD_SOURCES = [
  { key: 'lemino', url: 'https://lemino.docomo.ne.jp/ft/0000002/pxb/', file: 'lemino-pxb.html' }
];
export async function collectCards({ fetchImpl = fetch, now = new Date(), readCached = null } = {}) {
  const sources = [], packets = [];
  for (const source of CARD_SOURCES) {
    let attempts = 0;
    try {
      let html;
      if (readCached) html = await readCached(source.file);
      else {
        attempts++;
        const response = await fetchImpl(source.url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { Accept: 'text/html' } });
        if (!response.ok) { sources.push({ source: source.key, http: response.status, requests: attempts, outcome: [403,429,503].includes(response.status) ? 'blocked' : 'failed' }); continue; }
        if (!/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('unsupported_content_type');
        html = await response.text();
      }
      if (Buffer.byteLength(html) > 1024 * 1024) throw new Error('response_too_large');
      const result = parseSourceHtml(source.key, html, { sourceUrl: source.url });
      for (const item of result.events) packets.push(buildEventWritingPacket({ normalized_data: item.event, validation_errors: item.validationErrors, fetched_at: now.toISOString() }, { now }));
      sources.push({ source: source.key, http: readCached ? null : 200, requests: attempts, outcome: result.extractedCount ? 'parsed' : 'needs_review', events: result.events.map(x => ({ name: x.event.event_name, date: x.event.event_date, bouts: x.event.bouts.length, errors: x.validationErrors })) });
    } catch (error) { sources.push({ source: source.key, requests: attempts, outcome: 'failed', error: error.name === 'TimeoutError' ? 'timeout' : 'collection_failed' }); }
  }
  return { checked_at: now.toISOString(), sources, packets, database_writes: 0, publications: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const value = flag => args.includes(flag) ? args[args.indexOf(flag)+1] : null;
  const cache = value('--cached-dir');
  const report = await collectCards({ readCached: cache ? file => fs.readFile(path.join(cache, file), 'utf8') : null });
  const output = value('--output-dir');
  if (output) {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'event-writing-packets.json'), JSON.stringify(report, null, 2));
    for (const [index, packet] of report.packets.entries()) {
      if (!packet.can_prepare_draft) continue;
      await fs.writeFile(path.join(output, `event-${index + 1}-writing.md`), `${packet.writer_instructions}\n\n# ${packet.draft.title}\n\n${packet.draft.body}\n\n<!-- 要確認 -->\n${packet.required_checks.join('\n')}`);
    }
  }
  console.log(JSON.stringify({ sources: report.sources, ready: report.packets.filter(p => p.can_prepare_draft).length, database_writes: 0 }, null, 2));
  if (report.sources.some(s => ['failed', 'blocked', 'needs_review'].includes(s.outcome))) process.exitCode = 1;
}
