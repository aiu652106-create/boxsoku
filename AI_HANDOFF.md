# AI_HANDOFF

## Current revenue-flow work (2026-11-15)
- User authorized changes to make the boxing site easier to monetize, with no disclosure of personal information.
- Branch: `codex/revenue-viewing-guide-20261115`, based on fresh GitHub main `eb1815d`.
- Status: implementation and automated/read-only HTTP verification complete; visual verification BLOCKED.
- Added a shared viewing guide, an evergreen `/watch` route, an upcoming-event hub, and separate past-event archives. News is excluded from service schedule feeds. Existing feed order is preserved within each date group.
- SSR listings are no longer replaced by a second client fetch with inconsistent filters.
- Viewing guides distinguish event start from broadcast start. Subscription CTAs are not added for explicitly free or past events. Missing facts are not invented.
- Official Lemino announcement for November 26 was checked November 15; the announcement expires automatically after the event day in Asia/Tokyo. No bout order or images were inferred or added.
- Existing owner affiliate URLs are unchanged; added links use those exact URLs and the existing click-recording endpoint.
- Removed hard-coded public mailbox values from configuration, structured data and contact/about pages. Contact guidance now directs article corrections to existing comments and explicitly warns that comments may be public; there is no private contact inbox in this change.
- Click telemetry strips query strings/fragments on both client and server, and accepts only known public content routes. No new analytics identifier or database table was added.
- Local Node suite: 13 test files PASS, zero failures. Read-only preview against published article data: 9 routes HTTP 200; no email addresses or local filesystem paths in their HTML.
- Computer Use stopped because it could not confidently determine the Chrome URL. No further UI inputs were issued. PC/tablet/mobile visual review and real browser affiliate navigation are NOT verified.
- Production DB writes, migrations, article edits, social posts and production deployment: none.
- Next: inspect the preview at desktop, 768px and 390px; verify affiliate navigation. Do not report the public site as changed before deployment and production verification.

## Earlier event-source audit handoff (historical)

## Operating rules
- Codex: read this file before starting work and update it before finishing.
- ChatGPT: review repository state/diffs/tests directly; do not make the user relay long reports.
- Resolve ordinary implementation/test failures internally. Do not stop after the first fixable blocker.
- Never expose, print, commit, or replace secrets/tokens/cookies/`.env` values/API credentials/service-role keys.
- Do not perform destructive production changes unless explicitly authorized.
- External fetches must be low-frequency, low-parallel, and necessary only. On 403 / 429 / 503, stop that source immediately with zero retry.

## Last audited implementation
- Implementation commit: `8edaf57812bf85bc958abc297d8bad023ac71638`.
- Final handoff commit: `2bd6ab47d02f6676c2c81b0ed35633d1dbdd9742`.
- The architecture fixes are materially improved: scheduled trigger, stable source identity, bout reconciliation, exact request accounting, host validation, no automatic publication, and 403/429/503 zero-retry behavior are present in code.
- Codex reported the full local Node suite as 12/12 PASS.
- Production DB migration/write was not authorized.

## Current task
- Status: READY
- Goal: Close the remaining independent audit blocker: prove that the adapters work against the CURRENT real public source structure before any production migration or event-data write.

## Independent ChatGPT audit blockers

### 1. Existing parser tests are synthetic, not live-source representative
`tests/event-sources.test.mjs` currently fabricates both of the structures the parser accepts:
- a made-up `SportsEvent` JSON-LD block; and
- made-up `data-lemino-event`, `data-dangan-event`, `data-event-id`, `data-event-name`, etc. attributes.

The current parser only accepts structured JSON-LD events or DOM blocks carrying configured event markers. A deterministic test passing against invented markup does NOT establish that the current Lemino or DANGAN pages actually expose those structures.

Required:
- Perform at most ONE normal GET to the current configured Lemino source and at most ONE normal GET to the current configured DANGAN source for this validation cycle.
- Do not crawl child pages in bulk.
- Inspect the ACTUAL response structure locally.
- Do not save whole third-party HTML pages to the repository. Create only minimal sanitized fixtures containing the smallest structure necessary to reproduce the real parser behavior.
- Update the source-specific adapters to match the current real public structure, while remaining fail-closed against ambiguous multi-event association.
- A live read-only dry-run must parse current source HTML without DB writes and report exact extracted event count, event names/dates, and warnings.

### 2. DANGAN source is not proven usable
Current seed config still points DANGAN to:
`https://danganboxing.com/`

Public inspection shows the homepage exposes a link to the schedule rather than a clearly usable current event list. The currently discoverable `/schedule-list/` page also appears to return a "page not found" style body / old category archive instead of a reliable current schedule.

Required:
- Determine, from the current public DANGAN site only, whether there is a stable official URL that actually contains current/upcoming event data suitable for one low-frequency fetch.
- If such a URL exists, use that exact official URL and add a minimal real-structure fixture/test.
- If no reliable current DANGAN schedule source exists, disable DANGAN rather than claiming it is an operational source.
- Never invent a URL and never scrape search-engine cache/results as canonical data.

### 3. Boxing Mobile discovery is disabled without a documented accessibility check
The implementation registers Boxing Mobile as `discovery`, but seeds it disabled. That is safe, but it does not solve general event discovery.

Required:
- Perform at most ONE normal GET to the configured public Boxing Mobile schedule URL in this validation cycle.
- If HTTP 403 / 429 / 503 occurs, stop immediately, keep it disabled, record only status/outcome, and do not bypass controls.
- If it is publicly accessible, implement only a minimal low-frequency discovery adapter for event identity/name/date/link metadata needed to find candidate events. Do not copy article bodies/images.
- Discovery-only data must remain unable to publish canonical facts without official verification.

### 4. Coverage must be described truthfully
Do not declare "general Japanese boxing event automation" complete if the only actually working live source is Lemino.
- Report each source as `operational`, `disabled`, or `blocked` based on CURRENT read-only validation.
- Do not count a synthetic fixture as an operational source.
- If source coverage remains narrow, say so explicitly. Do not compensate by adding unverified sources.

## Production / safety boundary
- NO Supabase migration.
- NO production DB insert/update/delete.
- NO event publication.
- NO poster/image download or publication.
- NO boxer DB/import/boxer-page changes.
- NO article rewrites.
- NO high-frequency or parallel crawling.
- NO bypass of robots/access controls/login/paywalls/rate limits.
- Do not touch Staydesk or the science repository.
- Do not manually deploy Cloudflare.
- Because `main` may be connected to an automatic deployment pipeline, do implementation work on a separate branch for this cycle and do NOT merge it into `main` until ChatGPT audit approves it. Updating this handoff on `main` is the only authorized main-branch change for this cycle.

## Required verification
1. Current Lemino source: one-read live structure check + read-only parser dry-run.
2. Current DANGAN source: one-read live structure/usability check; operational only if genuinely parseable.
3. Current Boxing Mobile schedule: one-read accessibility check; implement discovery only if accessible without bypass.
4. Minimal sanitized real-structure fixtures, not fabricated attributes that do not exist on source pages.
5. Multi-event contamination test still PASS.
6. Stable source identity test still PASS.
7. Bout disappearance/reconciliation tests still PASS.
8. 403/429/503 zero-retry tests still PASS.
9. Missing scheduler secret fail-closed test still PASS.
10. Full existing test suite PASS.
11. Production DB writes/migrations: 0.
12. Production event publication: 0.

## Completion gate
Do NOT mark PASS merely because unit tests pass. PASS requires:
- at least one genuinely operational live source validated against its current public HTML;
- each configured source truthfully classified operational/disabled/blocked;
- no parser dependence on invented source markup;
- no production DB/publication action;
- full tests PASS.

## Final report / handoff update
When finished, update this file with:
- Status: PASS / BLOCKED
- Working branch + commit SHA
- Lemino: HTTP result, parser event count, event names/dates, operational yes/no
- DANGAN: HTTP result, actual source URL used, parser event count, operational/disabled/blocked
- Boxing Mobile: HTTP result only if checked, operational discovery/disabled/blocked
- Minimal fixtures/tests changed
- Full test result
- Production DB migration/write: none
- Production event publication: none
- Secret exposure: none
- Remaining coverage limitation
- Next action: wait for ChatGPT independent audit; do not merge/deploy
