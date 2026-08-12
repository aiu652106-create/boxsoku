# Project Instructions

## Core accuracy rules

- Do not fill missing facts with plausible guesses.
- Separate confirmed facts, inferences, and unknowns before making changes.
- Prefer primary sources and record the source used for externally sourced facts.
- When sources disagree, stop and resolve the disagreement before publishing.
- Treat dates, names, numbers, ordering, URLs, image sources, and rights as facts that require verification.
- Do not claim that a change is reflected until the public production page has been checked.

## Required change cycle

1. Define the requested change, the non-goals, and the completion criteria.
2. Inspect the current implementation and the current production behavior.
3. Collect and cross-check source facts. Mark unresolved items explicitly.
4. Implement the smallest change that satisfies the criteria.
5. Verify persistence by saving, reloading, and checking the stored value.
6. Verify deployment by opening the real production URL, not only a local preview.
7. Verify the rendered result on desktop and mobile-sized viewports.
8. Test empty values, long text, missing images, broken links, encoding, and duplicate content where relevant.
9. Re-check the result against the original source and completion criteria.
10. Report the URLs, checks performed, observed results, and any unverified items.

## Efficiency cycle

Use the following cycle to reduce repeated investigation without weakening verification:

1. Start with the smallest clear task unit and define its output and stop condition.
2. Reuse existing routes, templates, helpers, test commands, source lists, and browser checks before creating new ones.
3. Batch related reads and checks together, but keep each fact and acceptance criterion separately traceable.
4. Make one focused implementation pass, then run the narrowest check that can detect the likely failure first.
5. Use fixed verification recipes for recurring work: source-to-output for facts, input-to-public for data flow, and desktop/mobile for layout.
6. Stop investigating when the completion criteria are met and the required risk checks pass; record unresolved items instead of reopening settled decisions.
7. After repeated work, convert stable steps into a reusable helper, checklist, test, or documented rule.

For high-risk facts, deployment, persistence, rights, and user-visible layout, prioritize correctness over speed. For low-risk cosmetic or mechanical changes, use the shortest applicable recipe and avoid unrelated exploration.

## Affiliate operation cycle

Use this cycle for every affiliate change, even when the edit appears small:

Apply it to every article creation and article edit whenever any affiliate URL is present. Before saving, compare the entered URL character-for-character with the user-provided approved URL. After saving, inspect the production anchor and confirm the exact `href`, visible label, `rel="sponsored"`, and final click destination. Do not declare completion if either check was skipped.

1. Identify the program, the exact approved tracking URL, the visible text or image that should link, and the intended article or page scope.
2. Check whether the current link is missing, official, duplicated, or already affiliated; do not replace another service or add a second CTA by inference.
3. Implement the smallest change with the existing article, template, and disclosure patterns. Keep `target`, `rel="sponsored"`, and the visible destination wording correct.
4. Check the source-to-render path: stored value or config, server-rendered HTML, client-rendered fallback, and cache-busted CSS/JS when applicable.
5. Verify the CTA is visibly clickable, works on desktop and mobile, and does not overlap, truncate, or mislead the reader.
6. Open the real production URL with `boxsoku_verify=1`, confirm the exact text/image, href, disclosure, and click destination, then check one neighboring article or service for unintended changes.
7. Record the program URL and verification result in the task summary. Never introduce a paid service, purchase, or new billing setting without explicit approval.

## Affiliate performance improvement cycle

Use this cycle to improve earnings without blindly increasing ad volume:

1. Set one measurable goal for the period, such as affiliate clicks, click-through rate, conversion rate, earnings per article, or earnings per visit.
2. Establish a baseline by program, article category, device type, placement, CTA wording, and product group before changing the layout.
3. Match the offer to the reader's immediate intent: streaming links near the event and viewing information, products near relevant fight or fighter content, and no unrelated recommendation.
4. Test one variable at a time, such as text versus image, CTA wording, position, number of products, or article relevance. Keep the other conditions stable.
5. Prefer clear, honest CTAs and restrained placement. Do not hide links, create false urgency, interrupt the article repeatedly, or add offers that weaken trust or disclosure clarity.
6. Review enough traffic for a meaningful comparison, record the result and the losing variant, then keep the better variant only when the evidence supports it.
7. Re-check mobile layout, page speed, link validity, affiliate disclosure, and revenue attribution after every winning change.
8. Feed the result back into the next hypothesis. Do not assume that a high click rate means high earnings when conversion or earnings per visit falls.
9. When a metric changes, analyze the likely cause before editing again: traffic source or intent, offer relevance, CTA wording, placement visibility, device layout, page speed, link validity, inventory or viewing conditions, and attribution tracking.
10. Separate observation, hypothesis, evidence, and decision. Record what changed, what was expected, what actually happened, and the next smallest test so the same weak assumption is not repeated.

## Error learning and recurrence prevention

Whenever a mistake is found, the user corrects an assumption, or verification reveals an unexpected result:

1. Stop and record the exact symptom before changing more code.
2. Classify the cause: ambiguous requirements, unsupported inference, source conflict, data transformation, persistence, deployment, cache/environment, rendering/encoding, or scope control.
3. Identify the missing gate in the required change cycle.
4. Fix the immediate issue and add a concrete prevention measure to the appropriate place: this file, a test, a validation script, or a deployment check.
5. Re-run the original failing scenario and at least one nearby edge case.
6. Confirm the public result again and report both the fix and the new prevention measure.

This recurrence-prevention work is mandatory for every mistake, without waiting for the user to request it. After adding or strengthening a prevention measure, explicitly tell the user `サイクルに追加しました`.

For browser and responsive verification, never apply viewport or device emulation to a user-owned or already-open Chrome tab. Use a separate disposable verification tab, clear every emulation override before cleanup, and confirm the original user tab remains at its normal desktop state. When a screenshot and the deployed CSS suggest different causes, first distinguish browser state from site code; do not edit or deploy CSS until the failure is reproduced in a clean tab. If a speculative change was made from a wrong diagnosis, revert only that change and verify the restored production state.

For external fighter profiles and images, add a provider-identity gate before saving: use the provider's canonical profile URL (not a wiki or search-result URL), verify the page name and profile ID, and take the image URL from that same verified profile when the provider is the requested source. After saving, compare the editor value, preview href/src, reloaded value, and public href/src so a click target and its image cannot silently point to different or unrelated pages.

For fight-card images, follow the user's explicitly requested provider order. When the requested order is BoxRec then Boxing Mobile, inspect the canonical BoxRec profile first: use its real profile photo when present, treat the generic `v8-avatar` as no photo, and only then use the verified Boxing Mobile profile image. After saving, load every lazy image on production and verify its `src`, dimensions, fighter identity, and canonical BoxRec click target.

For streaming and affiliate link changes, add an exact-target gate before editing: capture the user's selected or named visible text, identify the current rendered element that owns it, and preserve the surrounding copy unless a wording change is requested. Verify the exact destination URL, `target`, and `rel` attributes, make the link visually identifiable without changing unrelated services, then check the server-rendered and client-rendered paths when both exist. After deployment, reload a production URL with `boxsoku_verify=1` and confirm the exact visible text, href, CSS version, and click target.

For article pages, keep the event/program lead image separate from fight-card media: only a fighter photo or fighter name inside a fight card may link to that fighter's verified profile. Before declaring completion, inspect the exact lead-image parent and every card-image href on the public page; an article-level profile URL must never be reused as the lead-image link.

For SEO and discovery changes, use one fixed production gate: confirm GET and HEAD both return `200`, Googlebot and OAI-SearchBot receive the same canonical content without visitor cookies or analytics writes, the sitemap contains the canonical URL, and metadata contains plain text without Markdown markers. Keep the useful article body before general product promotions, while placing streaming affiliate links next to the visible streaming information. Verify the server-rendered HTML and the client fallback use the same order and schema type.

Sitemap, canonical, Open Graph URLs, and internal links must use the final public URL that returns `200`; never publish a redirecting `.html` URL when Cloudflare Pages serves the canonical page extensionless. Crawl every sitemap URL with both GET and HEAD before deployment is considered complete.

Treat any reference page named by the user as a task-specific comparison target, not as a permanent template. First obey the current request and its explicit non-goals; use reference pages only to validate the requested behavior or appearance, and do not copy unrelated labels, structure, links, or content.

Do not treat a correction as learned merely because the current output was fixed. The workflow, test, or documented rule must change so the same failure mode has a new detection or prevention step.

## Numeric and count verification

- Treat every ranking, round count, date, price, percentage, record, and event count as a high-risk value.
- Before saving, build a source-to-output check for each numeric field instead of relying on visual memory or copied prose.
- Compare the numeric tokens individually, including digits, units, and the subject they belong to.
- Re-read the saved values after reload and compare them with the source check.
- Check internal counts for consistency, such as the number stated in an article matching the number of cards displayed.
- If a source contains a corrected or newer value, replace the old value everywhere it is displayed and re-check the public page.
- For admin editor changes, verify the live preview renders each newly editable field, not only the saved form value.
- When adding a data field, check the full path: input, live preview, save payload, reload, and public rendering.
- When changing a cached static asset, bump its version key and verify the production HTML loads the new CSS/JS URL; a stale cached page is not a reflection check.
- Treat asset version keys as immutable: after changing or reverting an asset, never reuse an older key; publish a new unique key so an old cached file cannot masquerade as the current build.
- If production still serves the previous asset version, do not report completion: wait for deployment, reload the same public tab with a unique QA query, then re-check the asset version and the relevant rendered coordinates.
- Live previews must render the complete saved body unless truncation is an explicit requirement; compare preview paragraph count and text coverage with the editor input.
- Tags are retired from the public article UI; use the confirmed article category and verify the category navigation instead.
- Keep unique visitors separate from PV. Verify that a new visitor token adds one unique visitor, a repeated token adds only PV, and the admin fallback remains readable before the migration is applied.
- Use `boxsoku_verify=1` for agent QA visits to article URLs; verification requests must skip PV and visitor RPCs so checks do not pollute analytics.
- When the user specifies where an SNS quote belongs, treat the position as part of the requested content. Unless the user says otherwise, place it as `target heading -> explanatory text -> embed -> following heading or paragraph`. Verify that exact production DOM order, confirm there is exactly one embed, and do not report completion after only editing or removing a neighboring section.
- For SPA account pages such as AdSense, do not wait indefinitely for a generic load event after navigation. Verify the target URL and a page-specific visible marker, use a disposable tab when possible, and after a timeout inspect the tab URL before reporting navigation success.
- When the user names a specific browser page to inspect, keep verification and actions scoped to that page; do not inspect or modify another site as a workaround unless explicitly requested.
- Optimize article decisions for the user's stated objective of qualified search traffic and affiliate revenue. If a requested tactic clearly works against that objective, say so directly, explain the user's likely intent, and offer the closest evidence-based alternative before editing; do not agree merely to be agreeable.
- When moving an SNS URL from a dedicated embed field into article body content, assume an empty field may preserve the old stored array. Deduplicate identical normalized URLs at render time and verify the final production page contains exactly one embed.

## Stop conditions

Stop instead of guessing when:

- a source, order, date, or value is ambiguous;
- the saved value cannot be confirmed after reload;
- local, deployed, and public results differ;
- the active repository or deployment target is uncertain;
- an image or external content has unclear usage rights;
- the result has clipping, overlap, broken links, encoding problems, or duplicated text.

## Scope and change safety

- Confirm the active repository before editing.
- Before editing a deployed site, compare the local branch with the remote deployment branch and inspect the production asset versions; do not start from an older local checkout.
- Namespace custom DOM data attributes so browser tooling or extensions cannot accidentally select and overwrite site-owned elements.
- Keep unrelated files and existing user changes untouched.
- Keep public layout unchanged unless the request explicitly includes a layout change.
- Prefer existing project patterns and avoid unnecessary dependencies.
- Run the narrowest relevant tests, then perform an end-to-end browser check for user-visible changes.
