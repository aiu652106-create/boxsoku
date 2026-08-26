const MAX_FIELD_LENGTH = 180;
const MAX_BOUTS = 40;

export const EVENT_SOURCE_DEFINITIONS = Object.freeze({
  lemino: Object.freeze({
    sourceName: "Lemino BOXING公式",
    sourceKind: "streaming",
    officialHosts: ["lemino.docomo.ne.jp"],
    eventMarkers: ["data-lemino-event", "data-event-id"]
  }),
  dangan: Object.freeze({
    sourceName: "DANGAN公式",
    sourceKind: "promoter",
    officialHosts: ["danganboxing.com"],
    eventMarkers: ["data-dangan-event", "data-event-id"]
  }),
  "boxing-mobile": Object.freeze({
    sourceName: "Boxing Mobile（発見用）",
    sourceKind: "discovery",
    officialHosts: ["boxmob.jp"],
    eventMarkers: ["data-boxing-mobile-event", "data-event-id"]
  })
});

const HTML_ENTITY_MAP = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"'
});

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
    );
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, code) => {
      const radix = String(code).toLowerCase().startsWith("x") ? 16 : 10;
      const number = Number.parseInt(String(code).replace(/^x/i, ""), radix);
      return Number.isFinite(number) ? String.fromCodePoint(number) : "";
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (_, name) =>
      Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, name.toLowerCase())
        ? HTML_ENTITY_MAP[name.toLowerCase()]
        : `&${name};`
    );
}

export function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value, maxLength = MAX_FIELD_LENGTH) {
  const text = stripHtml(value)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLength);
}

export function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function hostMatches(hostname, allowedHost) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  const allowed = String(allowedHost || "").toLowerCase().replace(/^www\./, "");
  return Boolean(allowed) && (host === allowed || host.endsWith(`.${allowed}`));
}

export function isApprovedSourceUrl(sourceKey, value) {
  const safe = safeHttpsUrl(value);
  if (!safe) return false;
  const definition = EVENT_SOURCE_DEFINITIONS[String(sourceKey || "").toLowerCase()];
  if (!definition) return false;
  try {
    const url = new URL(safe);
    return definition.officialHosts.some((host) => hostMatches(url.hostname, host));
  } catch {
    return false;
  }
}

function approvedSourceUrl(sourceKey, value) {
  return isApprovedSourceUrl(sourceKey, value) ? safeHttpsUrl(value) : "";
}

function normalizeIdentityPart(value) {
  return cleanText(value, 160)
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[|:：/／\\]+/g, "-");
}

function parseDate(value) {
  const normalized = normalizeDigits(value).replace(/[.\/]/g, "-");
  const match = normalized.match(/(20\d{2})年?(\d{1,2})月?(\d{1,2})日?/);
  if (!match) {
    const iso = normalized.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
    if (!iso) return "";
    const [, year, month, day] = iso;
    return validDate(year, month, day) ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  }
  const [, year, month, day] = match;
  return validDate(year, month, day) ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function parseTime(value) {
  const normalized = normalizeDigits(value);
  const match = normalized.match(/(?:^|\D)([01]?\d|2[0-3])(?::|時)([0-5]\d)?/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${String(match[2] || "00").padStart(2, "0")}:00`;
}

function objectValue(value, keys = []) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  for (const key of keys) {
    if (value[key]) return value[key];
  }
  return "";
}

function jsonLdNodes(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => jsonLdNodes(item, result));
    return result;
  }
  if (!value || typeof value !== "object") return result;
  result.push(value);
  if (value["@graph"]) jsonLdNodes(value["@graph"], result);
  return result;
}

function parseJsonLd(html) {
  const values = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of String(html || "").matchAll(pattern)) {
    const raw = String(match[1] || "").trim();
    if (!raw) continue;
    try {
      values.push(...jsonLdNodes(JSON.parse(raw)));
    } catch {
      // A malformed JSON-LD block is ignored; visible text can still be used.
    }
  }
  return values;
}

function attributeValue(attributes, name) {
  const pattern = new RegExp(
    `${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
    "i"
  );
  return String(attributes || "").match(pattern)?.[2] || "";
}

function eventType(value) {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => /event|sports?event/i.test(String(type || "")));
}

function extractVenue(text) {
  const match = String(text || "").match(/(?:会場|開催地|venue)\s*[:：]?\s*([^|｜、,。]{2,80})/i);
  return cleanText(
    String(match?.[1] || "").replace(/\s+(?:Lemino|U-NEXT|WOWOW|ABEMA).*$/i, ""),
    100
  );
}

function extractPromoter(text) {
  const match = String(text || "").match(/(?:主催|プロモーター|promoter)\s*[:：]?\s*([^|｜、,。]{2,80})/i);
  return cleanText(match?.[1] || "", 100);
}

function servicesFromText(text, sourceKey) {
  const services = [];
  const source = String(text || "");
  if (/Lemino/i.test(source) || sourceKey === "lemino") services.push("Lemino");
  if (/U-NEXT/i.test(source)) services.push("U-NEXT");
  if (/Prime\s*Video|Amazon\s*Prime/i.test(source)) services.push("Prime Video");
  if (/WOWOW|エキサイトマッチ/i.test(source)) services.push("WOWOW");
  if (/ABEMA/i.test(source)) services.push("ABEMA");
  return [...new Set(services)];
}

function participantName(value) {
  return cleanText(objectValue(value, ["name", "alternateName"]), 80);
}

function explicitBout(raw) {
  if (!raw || typeof raw !== "object") return null;
  const competitors = Array.isArray(raw.competitor)
    ? raw.competitor
    : Array.isArray(raw.performer)
      ? raw.performer
      : [];
  const a = cleanText(
    raw.fighter_a_name || raw.homeTeam?.name || participantName(competitors[0]),
    80
  );
  const b = cleanText(
    raw.fighter_b_name || raw.awayTeam?.name || participantName(competitors[1]),
    80
  );
  if (!a || !b) return null;
  const label = cleanText(raw.bout_label || raw.name || "", 120);
  const numberValue = raw.bout_number ?? raw.position;
  const numberMatch = String(numberValue || label).match(/第\s*(\d+)\s*試合/);
  const boutNumber = numberMatch
    ? Number(numberMatch[1])
    : Number.isInteger(Number(numberValue)) && Number(numberValue) > 0
      ? Number(numberValue)
      : null;
  return {
    bout_key: `bout-${normalizeIdentityPart(a)}-vs-${normalizeIdentityPart(b)}`.slice(0, 300),
    bout_number: Number.isInteger(boutNumber) ? boutNumber : null,
    bout_label: label,
    weight_class: cleanText(raw.weight_class || raw.category || "", 80),
    rounds: raw.rounds !== null && raw.rounds !== undefined && String(raw.rounds).trim() !== "" && Number.isInteger(Number(raw.rounds))
      ? Number(raw.rounds)
      : null,
    title_name: cleanText(raw.title_name || "", 120),
    fighter_a_name: a,
    fighter_a_gym: cleanText(raw.fighter_a_gym || raw.homeTeam?.memberOf?.name || "", 100),
    fighter_b_name: b,
    fighter_b_gym: cleanText(raw.fighter_b_gym || raw.awayTeam?.memberOf?.name || "", 100),
    is_main_event: /メイン|main\s*event/i.test(label),
    is_semifinal: /セミ|semi\s*final/i.test(label),
    normalized_data: {}
  };
}

function eventFromJsonLd(node, sourceKey, sourceUrl) {
  if (!eventType(node["@type"])) return null;
  const location = objectValue(node.location, ["name"]);
  const organizer = objectValue(node.organizer, ["name"]);
  const startDate = objectValue(node, ["startDate", "startTime"]);
  const name = cleanText(node.name, 180);
  if (!name) return null;
  const bouts = [];
  const subEvents = Array.isArray(node.subEvent) ? node.subEvent : node.subEvent ? [node.subEvent] : [];
  subEvents.forEach((item) => {
    const bout = explicitBout(item);
    if (bout) bouts.push(bout);
  });
  const description = cleanText(node.description, 300);
  const eventUrl = approvedSourceUrl(sourceKey, objectValue(node, ["url", "@id"]));
  const identifier = cleanText(objectValue(node, ["identifier"]), 180);
  return {
    event_name: name,
    event_date: parseDate(startDate),
    venue: cleanText(location, 100),
    location: cleanText(objectValue(node.location?.address, ["addressLocality", "streetAddress"]), 100),
    start_time: parseTime(startDate),
    broadcast_start_time: "",
    distribution_services: servicesFromText(`${name} ${description}`, sourceKey),
    organizer: cleanText(organizer, 100),
    promoter: extractPromoter(`${name} ${description}`),
    bouts,
    source_name: EVENT_SOURCE_DEFINITIONS[sourceKey]?.sourceName || sourceKey,
    source_url: sourceUrl,
    source_event_key: eventUrl || (identifier ? `id:${identifier}` : ""),
    source_event_url: eventUrl
  };
}

function dataAttribute(attributes, name) {
  return attributeValue(attributes, name);
}

function elementDataValue(block, name) {
  const attribute = dataAttribute(block, name);
  if (attribute) return attribute;
  const pattern = new RegExp(
    `<([a-z0-9]+)\\b[^>]*${name}\\s*=\\s*(["'])([\\s\\S]*?)\\2[^>]*>([\\s\\S]*?)<\\/\\1\\s*>`,
    "i"
  );
  return pattern.exec(block)?.[4] || "";
}

function eventBlocks(html, markers = []) {
  const blocks = [];
  const opening = /<(article|section|li|div)\b([^>]*)>/gi;
  for (const match of String(html || "").matchAll(opening)) {
    const attributes = match[2] || "";
    if (!markers.some((marker) => new RegExp(`(?:^|\\s)${marker}\\s*=`, "i").test(attributes))) {
      continue;
    }
    const tag = match[1];
    const closing = new RegExp(`<\\/${tag}\\s*>`, "ig");
    closing.lastIndex = match.index + match[0].length;
    const end = closing.exec(String(html || ""));
    if (!end) continue;
    blocks.push({
      attributes,
      html: String(html || "").slice(match.index, end.index + end[0].length)
    });
  }
  return blocks;
}

function boutBlocks(block) {
  const matches = [];
  const opening = /<(article|section|li|div)\b([^>]*data-bout(?:-[a-z-]+)?\s*=|[^>]*data-bout\b[^>]*)>/gi;
  for (const match of String(block || "").matchAll(opening)) {
    const tag = match[1];
    const closing = new RegExp(`<\\/${tag}\\s*>`, "ig");
    closing.lastIndex = match.index + match[0].length;
    const end = closing.exec(String(block || ""));
    if (end) matches.push(String(block || "").slice(match.index, end.index + end[0].length));
  }
  return matches;
}

function boutFromHtml(block) {
  const fighterA = cleanText(
    dataAttribute(block, "data-fighter-a") || elementDataValue(block, "data-fighter-a"),
    80
  );
  const fighterB = cleanText(
    dataAttribute(block, "data-fighter-b") || elementDataValue(block, "data-fighter-b"),
    80
  );
  if (!fighterA || !fighterB) return null;
  const label = cleanText(
    dataAttribute(block, "data-bout-label") || elementDataValue(block, "data-bout-label"),
    120
  );
  const numberValue = dataAttribute(block, "data-bout-number");
  const numberMatch = String(numberValue || label).match(/(?:第\s*)?(\d+)(?:\s*試合)?/);
  const boutNumber = numberMatch ? Number(numberMatch[1]) : null;
  return {
    bout_key: cleanText(
      dataAttribute(block, "data-bout-key") || `bout-${normalizeIdentityPart(fighterA)}-vs-${normalizeIdentityPart(fighterB)}`,
      300
    ),
    bout_number: Number.isInteger(boutNumber) && boutNumber > 0 ? boutNumber : null,
    bout_label: label,
    weight_class: cleanText(dataAttribute(block, "data-weight-class"), 80),
    rounds: Number.isInteger(Number(dataAttribute(block, "data-rounds")))
      ? Number(dataAttribute(block, "data-rounds"))
      : null,
    title_name: cleanText(dataAttribute(block, "data-title-name"), 120),
    fighter_a_name: fighterA,
    fighter_a_gym: cleanText(dataAttribute(block, "data-fighter-a-gym"), 100),
    fighter_b_name: fighterB,
    fighter_b_gym: cleanText(dataAttribute(block, "data-fighter-b-gym"), 100),
    is_main_event: dataAttribute(block, "data-main-event") === "true" || /メイン|main\s*event/i.test(label),
    is_semifinal: dataAttribute(block, "data-semifinal") === "true" || /セミ|semi\s*final/i.test(label),
    normalized_data: {}
  };
}

function eventFromHtmlBlock(sourceKey, sourceUrl, block) {
  const blockText = stripHtml(block.html);
  const eventUrl = approvedSourceUrl(
    sourceKey,
    dataAttribute(block.attributes, "data-event-url") || elementDataValue(block.html, "data-event-url")
  );
  const eventId = cleanText(
    dataAttribute(block.attributes, "data-source-event-key") ||
      dataAttribute(block.attributes, "data-event-key") ||
      dataAttribute(block.attributes, "data-event-id"),
    180
  );
  const name = cleanText(
    dataAttribute(block.attributes, "data-event-name") ||
      dataAttribute(block.attributes, "data-name") ||
      elementDataValue(block.html, "data-event-name") ||
      block.html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/i)?.[1],
    180
  );
  if (!name) return null;
  const bouts = boutBlocks(block.html).map(boutFromHtml).filter(Boolean);
  return {
    event_name: name,
    event_date: parseDate(
      dataAttribute(block.attributes, "data-event-date") ||
        dataAttribute(block.attributes, "data-date") ||
        blockText
    ),
    venue: cleanText(
      dataAttribute(block.attributes, "data-venue") || extractVenue(blockText),
      100
    ),
    location: cleanText(dataAttribute(block.attributes, "data-location"), 100),
    start_time: parseTime(
      dataAttribute(block.attributes, "data-start-time") ||
        blockText.match(/(?:開始|試合開始|配信開始)\s*[:：]?\s*[^|｜、,。]{1,20}/)?.[0] || ""
    ),
    broadcast_start_time: parseTime(dataAttribute(block.attributes, "data-broadcast-start-time")),
    distribution_services: servicesFromText(blockText, sourceKey),
    organizer: cleanText(dataAttribute(block.attributes, "data-organizer"), 100),
    promoter: cleanText(dataAttribute(block.attributes, "data-promoter"), 100),
    bouts,
    source_name: EVENT_SOURCE_DEFINITIONS[sourceKey]?.sourceName || sourceKey,
    source_url: sourceUrl,
    source_event_key: eventUrl || (eventId ? `id:${eventId}` : ""),
    source_event_url: eventUrl
  };
}

function uniqueEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = event.source_event_key || `${event.event_name}|${event.event_date}|${event.venue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function canonicalKey(event) {
  const sourceKey = normalizeIdentityPart(event?.source_key || event?.source_name || "unknown-source");
  const sourceEventKey = event?.source_event_key || event?.source_event_url;
  if (sourceKey && sourceEventKey) {
    return ("source|" + sourceKey + "|" + normalizeIdentityPart(sourceEventKey)).slice(0, 500);
  }
  return [
    "review",
    sourceKey,
    normalizeIdentityPart(event?.event_name || "unnamed-event"),
    String(event?.event_date || "undated"),
    normalizeIdentityPart(event?.venue || event?.location || "no-venue")
  ].join("|").slice(0, 500);
}

function cleanBout(bout) {
  const a = cleanText(bout?.fighter_a_name, 80);
  const b = cleanText(bout?.fighter_b_name, 80);
  if (!a || !b) return null;
  const boutKey = cleanText(
    bout?.bout_key || `bout-${normalizeIdentityPart(a)}-vs-${normalizeIdentityPart(b)}`,
    300
  );
  return {
    bout_key: boutKey,
    bout_number:
      bout?.bout_number !== null &&
      bout?.bout_number !== undefined &&
      String(bout.bout_number).trim() !== "" &&
      Number.isInteger(Number(bout.bout_number))
        ? Number(bout.bout_number)
        : null,
    bout_label: cleanText(bout?.bout_label, 120),
    weight_class: cleanText(bout?.weight_class, 80),
    rounds:
      bout?.rounds !== null &&
      bout?.rounds !== undefined &&
      String(bout.rounds).trim() !== "" &&
      Number.isInteger(Number(bout.rounds))
        ? Number(bout.rounds)
        : null,
    title_name: cleanText(bout?.title_name, 120),
    fighter_a_name: a,
    fighter_a_gym: cleanText(bout?.fighter_a_gym, 100),
    fighter_b_name: b,
    fighter_b_gym: cleanText(bout?.fighter_b_gym, 100),
    is_main_event: bout?.is_main_event === true,
    is_semifinal: bout?.is_semifinal === true,
    normalized_data: {}
  };
}

export function normalizeEvent(raw, { sourceKey, sourceUrl, fetchedAt } = {}) {
  const source = safeHttpsUrl(sourceUrl);
  const normalizedSourceKey = String(sourceKey || raw?.source_key || "").trim().toLowerCase();
  const eventUrl = approvedSourceUrl(normalizedSourceKey, raw?.source_event_url);
  const eventKey = cleanText(raw?.source_event_key || eventUrl, 500);
  const event = {
    event_name: cleanText(raw?.event_name || raw?.name, 180),
    event_date: parseDate(raw?.event_date || raw?.eventDate || raw?.startDate),
    venue: cleanText(raw?.venue, 100),
    location: cleanText(raw?.location, 100),
    start_time: parseTime(raw?.start_time || raw?.startTime),
    broadcast_start_time: parseTime(raw?.broadcast_start_time || raw?.broadcastStartTime),
    distribution_services: [...new Set(
      (Array.isArray(raw?.distribution_services) ? raw.distribution_services : [])
        .map((service) => cleanText(service, 60))
        .filter(Boolean)
    )].slice(0, 10),
    organizer: cleanText(raw?.organizer, 100),
    promoter: cleanText(raw?.promoter, 100),
    bouts: (Array.isArray(raw?.bouts) ? raw.bouts : [])
      .slice(0, MAX_BOUTS)
      .map(cleanBout)
      .filter(Boolean),
    source_name: EVENT_SOURCE_DEFINITIONS[normalizedSourceKey]?.sourceName || cleanText(raw?.source_name, 100) || normalizedSourceKey,
    source_kind: EVENT_SOURCE_DEFINITIONS[normalizedSourceKey]?.sourceKind || cleanText(raw?.source_kind, 40) || "official",
   source_url: source,
    source_key: normalizedSourceKey,
    source_event_key: eventKey,
    source_event_url: eventUrl
  };
  event.canonical_key = canonicalKey(event);
  return event;
}

export function validateEvent(event) {
  const errors = [];
  if (!event?.event_name || event.event_name.length < 3) errors.push("event_name_missing");
  if (!event?.event_date) errors.push("event_date_missing");
  if (!event?.source_url || !isApprovedSourceUrl(event?.source_key, event.source_url)) errors.push("source_url_invalid");
  if (!event?.source_event_key) errors.push("source_event_identity_missing");
  if (event?.source_event_url && !isApprovedSourceUrl(event?.source_key, event.source_event_url)) {
    errors.push("source_event_url_invalid");
  }
  const identity = String(event?.source_event_key || "");
  if ((identity.startsWith("http://") || identity.startsWith("https://")) && !isApprovedSourceUrl(event?.source_key, identity)) {
    errors.push("source_event_identity_invalid");
  }
  if (
    !event?.venue &&
    !event?.location &&
    !event?.promoter &&
    !event?.organizer &&
    !event?.bouts?.length
  ) {
    errors.push("identity_insufficient");
  }
  const serialized = JSON.stringify(event);
  if (/<(?:script|style|iframe|object|embed)\b|\bon[a-z]+\s*=/i.test(serialized)) {
    errors.push("unsafe_markup");
  }
  const boutKeys = new Set();
  for (const bout of event?.bouts || []) {
    if (boutKeys.has(bout.bout_key)) errors.push("duplicate_bout_key");
    boutKeys.add(bout.bout_key);
  }
  return [...new Set(errors)];
}

function comparableEvent(event) {
  return {
    event_name: event?.event_name || "",
    event_date: event?.event_date || "",
    venue: event?.venue || "",
    location: event?.location || "",
    start_time: event?.start_time || "",
    broadcast_start_time: event?.broadcast_start_time || "",
    distribution_services: event?.distribution_services || [],
    organizer: event?.organizer || "",
    promoter: event?.promoter || "",
    bouts: event?.bouts || []
  };
}

export function diffEvent(previous, next) {
  const before = comparableEvent(previous);
  const after = comparableEvent(next);
  const diff = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { before: before[key], after: after[key] };
    }
  }
  return diff;
}

function parseStructuredSourceHtml(sourceKey, html, { sourceUrl, fetchedAt } = {}) {
  const safeSourceUrl = safeHttpsUrl(sourceUrl);
  const definition = EVENT_SOURCE_DEFINITIONS[sourceKey];
  const jsonEvents = parseJsonLd(html)
    .filter((node) => eventType(node["@type"]))
    .map((node) => eventFromJsonLd(node, sourceKey, safeSourceUrl))
    .filter(Boolean);
  const domEvents = eventBlocks(html, definition?.eventMarkers || [])
    .map((block) => eventFromHtmlBlock(sourceKey, safeSourceUrl, block))
    .filter(Boolean);
  const rawEvents = uniqueEvents([...jsonEvents, ...domEvents]);
  const events = rawEvents.map((raw) => {
    const normalized = normalizeEvent(raw, { sourceKey, sourceUrl: safeSourceUrl, fetchedAt });
    return { event: normalized, validationErrors: validateEvent(normalized) };
  });
  return {
    events,
    extractedCount: events.length,
    parserWarnings: [
      ...(safeSourceUrl ? [] : ["source_url_invalid"]),
      ...(events.length ? [] : ["no_structured_event_data"])
    ]
  };
}

export function parseLeminoHtml(sourceKey, html, options = {}) {
  return parseStructuredSourceHtml("lemino", html, options);
}

export function parseDanganHtml(sourceKey, html, options = {}) {
  return parseStructuredSourceHtml("dangan", html, options);
}

export function parseBoxingMobileHtml(sourceKey, html, options = {}) {
  return parseStructuredSourceHtml("boxing-mobile", html, options);
}

export function parseSourceHtml(sourceKey, html, options = {}) {
  const adapter = getEventSourceAdapter(sourceKey);
  return adapter ? adapter.parse(sourceKey, html, options) : parseStructuredSourceHtml(sourceKey, html, options);
}

export const EVENT_SOURCE_ADAPTERS = Object.freeze({
  lemino: Object.freeze({
    key: "lemino",
    parse: parseLeminoHtml
  }),
  dangan: Object.freeze({
    key: "dangan",
    parse: parseDanganHtml
  }),
  "boxing-mobile": Object.freeze({
    key: "boxing-mobile",
    parse: parseBoxingMobileHtml
  })
});

export function getEventSourceAdapter(adapterKey) {
  return EVENT_SOURCE_ADAPTERS[String(adapterKey || "").toLowerCase()] || null;
}
