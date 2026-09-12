import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sql = await fs.readFile(`${projectRoot}/supabase/event-automation-2026-08-26.sql`, "utf8");

for (const table of [
  "boxing_events",
  "boxing_event_bouts",
  "event_source_configs",
  "event_fetch_runs",
  "event_update_candidates",
  "boxing_event_sources"
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
}
for (const functionName of [
  "list_event_source_configs",
  "begin_event_source_run",
  "save_event_update_candidate",
  "finish_event_source_run",
  "review_event_update_candidate",
  "event_card_needs_review"
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${functionName}`));
}
assert.match(sql, /add column if not exists boxing_event_id uuid/);
assert.match(sql, /source_key, display_name, source_kind, adapter_key, source_url/);
assert.match(sql, /source_kind in \('streaming', 'promoter', 'organizer', 'official', 'discovery'\)/);
assert.match(sql, /external_request_count integer/);
assert.match(sql, /source_event_key text/);
assert.match(sql, /status in \('active', 'removed', 'cancelled', 'needs_review'\)/);
assert.match(sql, /event_card_needs_review/);
assert.match(sql, /approved_removal/);
assert.match(sql, /p_event_id uuid/);
assert.match(sql, /discovery candidates cannot be published automatically/);
assert.match(sql, /status = 'removed'/);
assert.match(sql, /status = 'active'/);
assert.match(sql, /boxing_event_sources/);
assert.match(sql, /'https:\/\/lemino\.docomo\.ne\.jp\/ft\/0000002\/pxb\//);
assert.match(sql, /'https:\/\/danganboxing\.com\//);
assert.match(sql, /'lemino'[\s\S]*?'daily', 1800, 0, 10000, false, 'disabled'/);
assert.match(sql, /'dangan'[\s\S]*?'daily', 1800, 0, 10000, false, 'disabled'/);
assert.match(sql, /on conflict \(source_key\) do update set[\s\S]*?enabled = false[\s\S]*?state = 'disabled'/);
assert.doesNotMatch(sql, /raw_html|raw_html_body|<script/i);
assert.doesNotMatch(sql, /delete\s+from\s+public\.(boxing_events|boxing_event_bouts|event_update_candidates)/i);

function checkSqlLexing(value) {
  let parentheses = 0;
  let state = "normal";
  let dollarTag = "";
  let semicolons = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1] || "";
    if (state === "line-comment") {
      if (character === "\n") state = "normal";
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        state = "normal";
        index += 1;
      }
      continue;
    }
    if (state === "single-quote") {
      if (character === "'" && next === "'") index += 1;
      else if (character === "'") state = "normal";
      continue;
    }
    if (state === "double-quote") {
      if (character === '"' && next === '"') index += 1;
      else if (character === '"') state = "normal";
      continue;
    }
    if (state === "dollar-quote") {
      if (value.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = "";
        state = "normal";
      }
      continue;
    }
    if (character === "-" && next === "-") {
      state = "line-comment";
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      state = "block-comment";
      index += 1;
      continue;
    }
    if (character === "'") {
      state = "single-quote";
      continue;
    }
    if (character === '"') {
      state = "double-quote";
      continue;
    }
    if (character === "$") {
      const tag = value.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)?.[0];
      if (tag) {
        state = "dollar-quote";
        dollarTag = tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (character === "(") parentheses += 1;
    if (character === ")") {
      parentheses -= 1;
      assert.ok(parentheses >= 0, "SQL has an early closing parenthesis");
    }
    if (character === ";") semicolons += 1;
  }
  assert.equal(state, "normal", `SQL lexer ended in ${state}`);
  assert.equal(parentheses, 0, "SQL parentheses are unbalanced");
  assert.ok(semicolons >= 20, "SQL statement terminators are unexpectedly missing");
}

checkSqlLexing(sql);

console.log("Event automation schema checks passed");
