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

## Error learning and recurrence prevention

Whenever a mistake is found, the user corrects an assumption, or verification reveals an unexpected result:

1. Stop and record the exact symptom before changing more code.
2. Classify the cause: ambiguous requirements, unsupported inference, source conflict, data transformation, persistence, deployment, cache/environment, rendering/encoding, or scope control.
3. Identify the missing gate in the required change cycle.
4. Fix the immediate issue and add a concrete prevention measure to the appropriate place: this file, a test, a validation script, or a deployment check.
5. Re-run the original failing scenario and at least one nearby edge case.
6. Confirm the public result again and report both the fix and the new prevention measure.

Do not treat a correction as learned merely because the current output was fixed. The workflow, test, or documented rule must change so the same failure mode has a new detection or prevention step.

## Numeric and count verification

- Treat every ranking, round count, date, price, percentage, record, and event count as a high-risk value.
- Before saving, build a source-to-output check for each numeric field instead of relying on visual memory or copied prose.
- Compare the numeric tokens individually, including digits, units, and the subject they belong to.
- Re-read the saved values after reload and compare them with the source check.
- Check internal counts for consistency, such as the number stated in an article matching the number of cards displayed.
- If a source contains a corrected or newer value, replace the old value everywhere it is displayed and re-check the public page.

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
