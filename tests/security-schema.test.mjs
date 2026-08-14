import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");

assert.match(
  schema,
  /create policy "Public can read published articles"[\s\S]*?on public\.articles for select\s+to anon\s+using\s*\(/i
);
assert.match(
  schema,
  /create policy "Admins can read articles"[\s\S]*?on public\.articles for select\s+to authenticated[\s\S]*?public\.is_admin\(\)/i
);
assert.match(
  schema,
  /grant execute on function public\.is_admin\(\) to authenticated;/i
);

const publicArticlePolicy = schema.match(
  /create policy "Public can read published articles"([\s\S]*?)(?=\n\s*drop policy|\n\s*create policy|\n\s*grant |\n\s*revoke |$)/i
);
assert.ok(publicArticlePolicy);
assert.doesNotMatch(publicArticlePolicy[1], /public\.is_admin\(\)/i);

assert.match(
  schema,
  /alter table public\.affiliate_clicks enable row level security;/i
);
assert.match(
  schema,
  /create policy "Admins can read affiliate click stats"[\s\S]*?on public\.affiliate_clicks for select\s+to authenticated\s+using \(public\.is_admin\(\)\);/i
);
assert.match(
  schema,
  /revoke all on public\.affiliate_clicks from public, anon, authenticated;/i
);
assert.match(
  schema,
  /grant execute on function public\.record_affiliate_click\(text, text, text, text, text, text, text\)\s+to anon, authenticated;/i
);

console.log("Security schema checks passed");
