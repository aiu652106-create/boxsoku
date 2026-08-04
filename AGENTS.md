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

## Error learning and recurrence prevention

Whenever a mistake is found, the user corrects an assumption, or verification reveals an unexpected result:

1. Stop and record the exact symptom before changing more code.
2. Classify the cause: ambiguous requirements, unsupported inference, source conflict, data transformation, persistence, deployment, cache/environment, rendering/encoding, or scope control.
3. Identify the missing gate in the required change cycle.
4. Fix the immediate issue and add a concrete prevention measure to the appropriate place: this file, a test, a validation script, or a deployment check.
5. Re-run the original failing scenario and at least one nearby edge case.
6. Confirm the public result again and report both the fix and the new prevention measure.

For external fighter profiles and images, add a provider-identity gate before saving: use the provider's canonical profile URL (not a wiki or search-result URL), verify the page name and profile ID, and take the image URL from that same verified profile when the provider is the requested source. After saving, compare the editor value, preview href/src, reloaded value, and public href/src so a click target and its image cannot silently point to different or unrelated pages.

For article pages, keep the event/program lead image separate from fight-card media: only a fighter photo or fighter name inside a fight card may link to that fighter's verified profile. Before declaring completion, inspect the exact lead-image parent and every card-image href on the public page; an article-level profile URL must never be reused as the lead-image link.

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
- Keep unrelated files and existing user changes untouched.
- Keep public layout unchanged unless the request explicitly includes a layout change.
- Prefer existing project patterns and avoid unnecessary dependencies.
- Run the narrowest relevant tests, then perform an end-to-end browser check for user-visible changes.
