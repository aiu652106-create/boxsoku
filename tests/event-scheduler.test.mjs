import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { runScheduledSync } from "../scripts/event-sync-scheduler.mjs";

let requests = 0;
const skipped = await runScheduledSync({
  env: { BOXSOKU_SERVER_TOKEN: "" },
  fetchImpl: async () => {
    requests += 1;
    throw new Error("must not call fetch without secret");
  }
});
assert.equal(skipped.skipped, true);
assert.equal(skipped.externalRequests, 0);
assert.equal(requests, 0);

let call = null;
const completed = await runScheduledSync({
  env: {
    BOXSOKU_SERVER_TOKEN: "scheduler-secret",
    BOXSOKU_EVENT_SYNC_URL: "https://boxsoku.test/api/event-sync"
  },
  fetchImpl: async (url, init) => {
    call = { url, init };
    return new Response("{}", { status: 200 });
  }
});
assert.equal(completed.ok, true);
assert.equal(completed.externalRequests, 1);
assert.equal(call.url, "https://boxsoku.test/api/event-sync");
assert.equal(call.init.method, "POST");
assert.equal(call.init.headers["X-Boxsoku-Event-Sync-Token"], "scheduler-secret");
assert.equal(call.init.body, "{}");

const workflow = await fs.readFile(new URL("../.github/workflows/event-sync.yml", import.meta.url), "utf8");
assert.match(workflow, /schedule:/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /secrets\.BOXSOKU_SERVER_TOKEN/);
assert.match(workflow, /node scripts\/event-sync-scheduler\.mjs/);
assert.doesNotMatch(workflow, /curl\s+/i);

console.log("Event scheduler checks passed");
