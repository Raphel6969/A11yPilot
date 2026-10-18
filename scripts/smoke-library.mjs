import assert from "node:assert/strict";
import { loadJourney } from "@a11ypilot/core";
import { jsonReport } from "@a11ypilot/reporters";

const loaded = await loadJourney("journey.example.yml");
assert.equal(loaded.journey.name, "Check the demo form");
assert.equal(loaded.steps.length, 1);
assert.match(
  jsonReport({
    schemaVersion: 1,
    runId: "smoke",
    startedAt: new Date(0).toISOString(),
    durationMs: 0,
    journey: { name: loaded.journey.name, start: loaded.journey.start },
    status: "completed",
    traces: [],
    findings: [],
  }),
  /"journey"/,
);

console.log("Library package smoke test passed.");
