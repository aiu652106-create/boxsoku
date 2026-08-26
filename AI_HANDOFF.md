# AI_HANDOFF

## Operating rules
- Codex: read this file before starting work and update it before finishing.
- ChatGPT: review repository state/diffs/tests directly; do not make the user relay long reports.
- Resolve ordinary implementation/test failures internally. Do not stop after the first fixable blocker.
- Never expose, print, commit, or replace secrets/tokens/cookies/`.env` values/API credentials/service-role keys.
- Do not perform destructive production changes unless explicitly authorized.
- External fetches must be low-frequency, low-parallel, and necessary only. On 403 / 429 / 503, stop that source immediately; do not retry aggressively.

## Current task
- Status: PASS
- Goal: Repair and complete the boxing event automation introduced by commit `260071e62f7e496b41d7cab554a4c2df88f2bb93`. Code and deterministic tests are complete; production deployment, migrations, DB writes, and event publication were not performed.

## Completed result
- Commit SHA: `8edaf57` (`fix: complete boxing event automation safeguards`)
- Scheduler: `.github/workflows/event-sync.yml` runs once daily and supports `workflow_dispatch`; `scripts/event-sync-scheduler.mjs` fails closed when `BOXSOKU_SERVER_TOKEN` is absent and never prints the secret.
- Source types/sources: Lemino (`streaming`) and DANGAN (`promoter`) use bounded source-specific adapters. Boxing Mobile is represented as a disabled, low-frequency `discovery` source and cannot publish canonical facts.
- Stable event identity: `boxing_event_sources` maps `(source_key, source_event_key)` to one canonical event. Mutable name/date/venue/card fields are not primary identity; missing stable identity requires review/manual mapping.
- Bout reconciliation: disappeared or changed bouts become `needs_review`; explicit admin approval marks removed bouts `removed` without DELETE. Public rendering exposes only approved active bouts. Bout order remains null unless explicitly encoded.
- Request policy: 403/429/503 stop a source with zero retry. Other permitted transient failures have at most one bounded retry, and `external_request_count` records actual outbound attempts.
- Tests: full Node test suite PASS, 12 passed / 0 failed, including all 15 required deterministic scenarios and static SQL safety checks.
- Production deploy: none. Production DB changes/migrations: none. Secret exposure: none. Unrelated repositories: untouched.
- Remaining blocker: none in local code/test scope.
- Next action: wait for ChatGPT independent audit before any production action.

## Historical audit requirements (completed above)
The requirements below document the audit that was addressed in this work cycle.

### 1. It is not actually scheduled
- `README_DEPLOY.md` currently says an external Cron must call `POST /api/event-sync` once per day.
- That means the feature is an endpoint, not a completed automation.
- Add an actual repository-controlled daily scheduler. Prefer a minimal GitHub Actions scheduled workflow unless an existing repository-native scheduler is already present and safer.
- Scheduler must call the existing sync endpoint at most once per day.
- Secret/token must come only from repository/environment secrets; never commit the value.
- If the secret is absent, fail closed without attempting the external sync.
- Keep a manual `workflow_dispatch` trigger for controlled verification if appropriate.

### 2. Source coverage is too narrow
- Current seed config contains only Lemino and DANGAN.
- This is not enough for a general Japanese boxing event schedule.
- Add a discovery-source concept separate from an authoritative/official source.
- The public Boxing Mobile schedule may be used only as a LOW-FREQUENCY DISCOVERY source if it is publicly accessible without bypassing controls. Do not mass crawl it and do not copy article text/images.
- If Boxing Mobile returns 403/429/503 or otherwise resists automated access, stop and leave it disabled; do not bypass protections.
- Discovery data alone must never become published canonical facts.
- For each discovered event, authoritative fields should be verified from an approved official source when available: promoter/organizer/gym/streamer/sanctioning-body/event official page.
- Make source types explicit, e.g. `discovery` vs `official`/`promoter`/`streaming`.

### 3. Current generic fallback parser can combine unrelated data
- `functions/_shared/event-sources.js` currently has a generic fallback that scans the whole page, takes a date from page text, then chooses a relevant link/title.
- On a portal/homepage containing multiple events, this can pair the wrong event name/date/venue/link.
- Remove fail-open whole-page guessing for multi-event/index pages.
- Parse only data that is structurally associated with the same event: valid JSON-LD event objects, explicit per-event DOM blocks, or a source-specific bounded adapter.
- If association is ambiguous, produce `needs_review` or no candidate. Never synthesize one event from unrelated page fragments.
- Lemino and DANGAN must have source-specific adapters/fixtures rather than both blindly using the same generic behavior.

### 4. Event identity is based on mutable fields and can create duplicates
- Current `canonicalKey()` includes event name/date/venue/promoter/main bout.
- These fields can legitimately change or become known later, causing the same event to receive a new key and be treated as new.
- Introduce stable source identity.
- Preferred design: maintain a source-to-event mapping such as `boxing_event_sources` with unique `(source_key, source_event_key)` and `event_id`, where `source_event_key` comes from a stable official event URL/ID when available.
- Do not use mutable venue/card/promoter data as the primary identity.
- If no stable external identity exists, require review/manual matching instead of silently creating a duplicate.
- Cross-source aliases for the same event must be able to point to one canonical event.

### 5. Card removal/update handling can leave stale bouts
- Current approval logic upserts bouts but does not reconcile bouts that disappeared from a later approved card.
- Current `needs_review` guard only catches a very large card-count drop; a smaller cancellation/removal can remain silently stale.
- Any previously-known bout disappearing, fighter pair changing, or explicit card-order change must become `needs_review`.
- Do not auto-delete historical bout rows.
- Add a safe status/reconciliation mechanism (for example `active`, `removed`, `cancelled`, `needs_review`) so an explicitly approved removal stops appearing publicly without losing history.
- Public rendering must show only currently approved active bouts.
- Never infer cancellation merely because one fetch temporarily omitted a bout.

### 6. 403 / 429 / 503 behavior conflicts with the low-load rule
- Current sync retries 5xx, including 503, and later treats it as a normal failure/cooldown.
- Change behavior so 403, 429, and 503 immediately stop that source for the run with zero retry.
- Do not automatically hammer a stopped source.
- Other transient errors may have at most one bounded retry only if already allowed by source config.

### 7. Request accounting is inaccurate
- `externalRequests` currently reports one request even when the fetch helper actually retries and performs two source requests.
- Count real outbound attempts exactly.
- Logs/tests must distinguish source requests from Supabase/internal requests.
- Completion report must include actual source-request count per source.

### 8. Official-link host validation is incomplete
- `EVENT_SOURCE_DEFINITIONS` already contains `officialHost`, but current URL selection only checks HTTPS.
- A candidate marked as an official source must not silently store an arbitrary external link found on the page.
- Enforce configured approved host(s) for authoritative source URLs.
- If a link leaves the official host, either classify it separately or reject it for official-source authority.

### 9. Poster/image handling must remain fail-closed
- If event poster support is added, only accept a poster candidate explicitly originating from the event/promoter/organizer/streamer official source.
- Do not scrape/copy images from unrelated media or search results.
- Store provenance/source URL and require manual approval before public use.
- Do not auto-download or auto-publish a poster in this task.

### 10. Bout order must never be guessed
- Keep `bout_number`, main, and semifinal only when explicitly stated by the same authoritative source or structurally encoded for that event.
- If order is not published yet, leave it unset. Do not infer order from HTML position unless the source-specific adapter proves that position means official bout order.

## Scope protection
- Do not modify boxer DB/import/boxer-page behavior in this task unless a test failure proves the event automation directly requires it.
- Do not delete or rewrite existing articles.
- Do not change existing manual fight cards.
- Do not change public event data.
- Do not apply `supabase/event-automation-2026-08-26.sql` to production.
- Do not deploy Cloudflare Pages/Functions in this run.
- Do not touch Staydesk or the science repository.

## Required tests
Add/adjust deterministic tests for at least all of the following:
1. Multi-event index page cannot cross-pair event A title with event B date/venue.
2. Lemino adapter and DANGAN adapter parse source-specific fixtures independently.
3. Stable source event ID/URL maps changed venue/name/card back to the same canonical event.
4. Same event discovered from two sources can map to one canonical event without duplicate creation.
5. One bout disappearing from an existing card becomes `needs_review`.
6. Approved removal/status reconciliation prevents stale bout from public rendering while preserving history.
7. 403 => zero retry / source stopped.
8. 429 => zero retry / source stopped.
9. 503 => zero retry / source stopped.
10. A retryable allowed transient failure performs no more than one retry and request count is exact.
11. External off-host link cannot be accepted as an authoritative official source URL.
12. Missing scheduler secret causes scheduled job to fail closed without calling `/api/event-sync`.
13. No event candidate is automatically published.
14. No poster candidate is automatically published.
15. Unknown bout order remains null/unset.

Run the complete existing test suite too, not only new tests.

## Completion gates
All must PASS before declaring completion:
- Event parser cross-event contamination: 0
- Duplicate-event scenario from mutable identity: 0 in tests
- Stale active bout after approved card removal: 0 in tests
- 403 retry count: 0
- 429 retry count: 0
- 503 retry count: 0
- Real outbound source-request accounting mismatch: 0
- Off-host authoritative URL acceptance: 0
- Automatic publication without explicit admin approval: 0
- Production deploys: 0
- Production DB writes/migrations: 0
- Secret exposure: 0
- Unrelated repository/project changes: 0
- Full existing test suite: PASS

## Work style
- Inspect current code first; do not rewrite the entire site.
- Fix the architecture coherently rather than stacking one-off patches.
- You may iterate internally as many times as necessary until all gates pass.
- Do not stop for ordinary code/test failures; repair them yourself.
- If a genuine external blocker remains (for example a service requires interactive authentication), finish everything else first and report only the single remaining blocker.

## Final handoff record
- Changed files: `README_DEPLOY.md`, `event-updates.js`, `functions/_shared/event-sources.js`, `functions/api/event-candidates.js`, `functions/api/event-sync.js`, `functions/news/[slug].js`, `supabase/event-automation-2026-08-26.sql`, `.github/workflows/event-sync.yml`, `scripts/event-sync-scheduler.mjs`, and the event automation tests.
- The completed code and this handoff must be committed and pushed to `main` after local tests pass. Do not deploy production.
