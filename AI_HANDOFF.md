# AI_HANDOFF

## Operating rules
- Read this file before starting and update it before finishing.
- Do not expose credentials, tokens, cookies or local personal filesystem paths.
- Low-frequency source reads only. Stop on 403/429/503 without retry.
- Work remains on a review branch. No merge/main implementation push, production deployment, DB migration, article publication or existing article overwrite was performed or authorized for this cycle.

## Current result (2026-09-12)
- Status: PASS for local official-card collection and AI-writing preparation; production activation pending.
- Branch: codex/live-source-validation-20260827
- Implementation commit: see the commit introducing this handoff result.
- Latest user scope: automatically collect fight cards, then make those facts available to AI to write one event-schedule article per show.
- This implements evidence preparation plus a factual draft scaffold. It does not invoke an LLM or claim that scaffold is AI-authored prose.

## Live source findings
- Normal reads were sequential and cached outside the repository for reuse.
- Lemino portal: HTTP 200, 1 request; observed link to /ft/0000002/pxb/.
- Lemino /pxb/: HTTP 200, 1 request; 2 events, 12 bouts:
  - PHOENIX BATTLE 160, 2026-09-08, Korakuen Hall, 6 bouts. Past event excluded from new draft generation.
  - PHOENIX BATTLE 161, 2026-09-21, Tama Mirai Messe, 6 bouts. One upcoming writing packet.
- Operational card coverage: Lemino PHOENIX BATTLE only. Not all domestic boxing.
- DANGAN homepage: HTTP 200, 1 request; current schedule section empty. Disabled; no guessed URL or child crawl.
- Boxing Mobile public schedule: HTTP 200, 1 request; 36 metadata-only discovery entries. Parser retains month/day separately and does not infer year, cards or bout order. Remains disabled pending official verification.
- Total source requests this cycle: 4. All subsequent parser/CLI dry-runs used cached responses, external requests 0. No images downloaded.
- Minimal sanitized real-structure excerpts in tests/fixtures; whole source pages were not committed.

## Implementation
- event-real-html.js parses balanced event/card boundaries using the observed pxb_inner / pxb_date / match_list / match_title / name structure.
- Preserves official fragment IDs (#pb160/#pb161), explicit bout numbers, names in Japanese, weight, rounds, title label, date, venue and broadcast time.
- Ambiguous card rows produce review errors. No array-position guesses, no country-to-gym guesses.
- scripts/collect-event-cards.mjs: one source request, no retries or DB operations, JSON evidence packets and upcoming event draft scaffolds.
- .github/workflows/event-card-packets.yml: daily 09:47 JST plus manual dispatch; uploads writing artifacts with seven-day retention. Scheduling activates only after later approved default-branch integration.
- functions/api/event-writing.js: admin-authenticated read-only candidate-to-writing packet endpoint.
- event-updates.js: inspect/copy AI instructions and evidence; explicit new draft save for eligible candidates via existing article save API. Stable candidate-based slug prevents duplicate creation. No existing article update or automatic publishing.
- Packet includes source URL, checked_at, data, blockers, writing instructions and publication checks. Past/rejected/stale/review/discovery-only candidates cannot prepare a draft.
- BoxRec identity URLs, approved event image and owner's verified affiliate links remain required checks; no invented IDs, remote image embedding, generated images or blanket PR disclosure.
- Read auth accepts browser same-origin GET only with same-origin Fetch Metadata and matching Referer when Origin is absent. Writes still require matching Origin and admin authentication.
- Existing SQL file only changes seeds to the verified Lemino /pxb/ URL, retaining disabled state until production setup. No migration applied.

## Verification
- Full Node suite: 14 test files PASS, 0 failures.
- Real minimal HTML tests: two-event separation, explicit order, no order inference, malformed card review, comment exclusion, discovery year unknown.
- Packet tests: past/discovery rejection, draft-only, no affiliate/image fabrication, proper event scope.
- Endpoint tests: authenticated GET works without Origin; cross-origin request denied; write without Origin denied; all backend operations are reads.
- Collector tests: cached parse performs 0 fetches; 403/429/503 exactly one attempt then blocked.
- Cached full-page dry-run: 2 events / 12 bouts / 1 upcoming packet / 0 DB writes.
- No production UI smoke test or production article save was run. Local automated tests do not imply deployed operation.

## Next action
- Independently audit this branch and diff.
- Do not represent daily collection as currently running: workflow and UI are not deployed.
- After explicit production approval, integrate the branch, configure/apply the event migration as needed, activate only verified sources, and verify the first scheduled artifact and admin draft flow.
- AI can already consume local event-card-output/event-writing-packets.json. This output folder is ignored by git.
