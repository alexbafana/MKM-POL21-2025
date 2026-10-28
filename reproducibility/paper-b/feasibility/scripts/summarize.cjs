const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const dir = path.resolve(__dirname, "../results"),
  log = fs
    .readFileSync(path.join(dir, "test-output.txt"), "utf8")
    .replace(/\x1b\[[0-9;]*m/g, "");
const match = log.match(/\b(\d+) passing/);
assert(match);
assert.equal(Number(match[1]), 30);
assert(!/\b[1-9]\d* failing/.test(log));
const report = {
  passed: true,
  integrationTests: 30,
  artifactIntegrityNegativeCases: 3,
  selectedRequirementBindings: 14,
  institutionalConfirmation: false,
  baselineReclassified: false,
  scope: "Model-linked single-version local publication; selected clauses only",
};
fs.writeFileSync(
  path.join(dir, "summary.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
