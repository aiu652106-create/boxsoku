import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sql = await fs.readFile(`${projectRoot}/supabase/event-automation-2026-08-26.sql`, "utf8");

function cardNeedsReview(previous, next) {
  const nextByKey = new Map(next.map((bout) => [bout.bout_key, bout]));
  return previous.some((bout) => {
    const replacement = nextByKey.get(bout.bout_key);
    return !replacement ||
      replacement.fighter_a_name !== bout.fighter_a_name ||
      replacement.fighter_b_name !== bout.fighter_b_name ||
      (bout.bout_number != null && replacement.bout_number != null && bout.bout_number !== replacement.bout_number);
  });
}

const unchanged = [{ bout_key: "a", bout_number: 1, fighter_a_name: "A", fighter_b_name: "B" }];
assert.equal(cardNeedsReview(unchanged, unchanged), false);
assert.equal(cardNeedsReview([...unchanged, { bout_key: "b", bout_number: 2, fighter_a_name: "C", fighter_b_name: "D" }], unchanged), true);
assert.equal(cardNeedsReview(unchanged, [{ bout_key: "a", bout_number: 2, fighter_a_name: "A", fighter_b_name: "B" }]), true);
assert.equal(cardNeedsReview(unchanged, [{ bout_key: "a", bout_number: 1, fighter_a_name: "A", fighter_b_name: "E" }]), true);

const sourceMap = new Map();
const canonicalEventId = "event-1";
sourceMap.set("lemino|event-160", canonicalEventId);
sourceMap.set("dangan|event-160", canonicalEventId);
assert.equal(new Set(sourceMap.values()).size, 1);
assert.match(sql, /unique \(source_key, source_event_key\)/);
assert.match(sql, /p_event_id uuid default null/);
assert.match(sql, /on conflict \(source_key, source_event_key\) do update set/);
assert.match(sql, /set status = 'removed'/);
assert.doesNotMatch(sql, /delete\\s+from\\s+public\\.boxing_event_bouts/i);
assert.match(sql, /source_cfg\.source_kind = 'discovery'/);
assert.doesNotMatch(sql, /poster_url|poster_candidate/i);

console.log("Event reconciliation checks passed");
