// Bounded extraction from observed public HTML. No scripts, images or child fetches.
export function elements(html, tag, predicate = () => true) {
  const source = String(html).replace(/<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  const stack = [], result = [];
  for (const match of source.matchAll(tokens)) {
    if (match[0].startsWith('</')) {
      const start = stack.pop();
      if (start && predicate(start.attrs)) result.push({ attrs: start.attrs, html: source.slice(start.end, match.index) });
    } else stack.push({ attrs: match[0], end: match.index + match[0].length });
  }
  return result;
}
export function attr(value, key) {
  return value.match(new RegExp(`\\b${key}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] || '';
}
export function hasClass(value, name) { return attr(value, 'class').split(/\s+/).includes(name); }
export function text(value) {
  return String(value).replace(/<br\b[^>]*>/gi, '').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
const byClass = (html, tag, name) => elements(html, tag, a => hasClass(a, name));

export function leminoFightCards(html, sourceUrl) {
  const events = [];
  for (const block of byClass(html, 'div', 'pxb_inner')) {
    const id = attr(block.attrs, 'id');
    if (!/^pb\d+$/.test(id)) continue;
    const headings = elements(block.html, 'h3');
    const info = byClass(block.html, 'ul', 'pxb_date');
    if (headings.length !== 1 || info.length !== 1) continue;
    const fields = new Map(elements(info[0].html, 'li').map(row => {
      const label = elements(row.html, 'span')[0];
      return [label ? text(label.html) : '', text(row.html.replace(/<span\b[^>]*>[\s\S]*?<\/span>/i, ''))];
    }));
    const date = fields.get('開催日')?.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!date) continue;
    const bouts = [], warnings = [];
    const lists = byClass(block.html, 'ul', 'match_list');
    for (const list of lists) for (const row of elements(list.html, 'li')) {
      const names = byClass(row.html, 'p', 'name').map(n => text(n.html));
      const label = text(byClass(row.html, 'div', 'match_title')[0]?.html || '');
      if (names.length !== 2 || !names.every(Boolean) || !label) { warnings.push('ambiguous_card_row'); continue; }
      const affiliations = byClass(row.html, 'p', 'birthplace').map(n => text(n.html).replace(/^[（(]|[）)]$/g, ''));
      const number = label.match(/第\s*(\d+)\s*試合/);
      const rounds = label.match(/(\d+)\s*回戦/);
      const weight = label.replace(/・/g, '').match(/(?:スーパー)?(?:ミニマム|ライトフライ|フライ|バンタム|フェザー|ライト|ウェルター|ウエルター|ミドル|クルーザー|ヘビー)級|\d+(?:\.\d+)?\s*kg契約/i)?.[0] || '';
      bouts.push({
        fighter_a_name: names[0], fighter_b_name: names[1],
        // The source combines gyms and countries; do not misclassify them as gyms.
        fighter_a_gym: '', fighter_b_gym: '',
        normalized_data: { affiliations },
        bout_number: number ? Number(number[1]) : null, bout_label: label,
        rounds: rounds ? Number(rounds[1]) : null, weight_class: weight,
        title_name: /タイトルマッチ|王座.*戦/.test(label) ? label.replace(/^.*?試合[＞>]\s*/, '').replace(/^(メイン|セミ)\s*/, '').replace(/\s*\d+回戦$/, '').trim() : '',
        is_main_event: /メイン/.test(label), is_semifinal: /セミ/.test(label)
      });
    }
    const url = new URL(sourceUrl); url.hash = id;
    events.push({ event_name: text(headings[0].html), event_date: `${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`,
      venue: fields.get('開催地') || '', broadcast_start_time: (fields.get('生配信日時') || fields.get('本配信開始日時') || '').match(/\d{1,2}:\d{2}/)?.[0] || '',
      distribution_services: ['Lemino'], source_event_key: url.href, source_event_url: url.href,
      bouts, extraction_warnings: [...new Set(warnings)] });
  }
  return events;
}

export function boxingMobileDiscovery(html, sourceUrl) {
  // This list gives month/day only. Never guess a year from the clock or banner.
  return elements(html, 'div', a => hasClass(a, 'schedule') || hasClass(a, 'schedule_attention')).flatMap(block => {
    const center = byClass(block.html, 'div', 'schedule_center_2nd')[0];
    const date = text(byClass(block.html, 'div', 'schedule_left')[0]?.html || '');
    const link = center && elements(center.html, 'a')[0];
    if (!link || !/^\d{1,2}\/\d{1,2}$/.test(date)) return [];
    const url = new URL(attr(link.attrs, 'href').replace(/&amp;/g,'&'), sourceUrl);
    if (url.hostname !== 'boxmob.jp' || !/^\d+$/.test(url.searchParams.get('sid') || '')) return [];
    return [{ event_name: text(link.html.split(/<br\b/i)[0]), event_date: '', bouts: [],
      source_event_key: url.href, source_event_url: url.href,
      discovery_date_label: date, extraction_warnings: ['discovery_requires_official_verification', 'year_not_explicit'] }];
  });
}
