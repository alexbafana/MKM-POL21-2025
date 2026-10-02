import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "artifact-manifest.json"), "utf8"));
const testDir = path.join(repoRoot, "packages", "hardhat", "test");
const testFiles = fs.readdirSync(testDir).filter(name => name.endsWith(".ts")).sort();

let testCount = 0;
let forbiddenFocusedTests = 0;
for (const file of testFiles) {
  const source = fs.readFileSync(path.join(testDir, file), "utf8");
  testCount += (source.match(/\bit\s*\(/g) || []).length;
  forbiddenFocusedTests += (source.match(/\b(?:it|describe)\.(?:only|skip|todo)\s*\(/g) || []).length;
}

const csv = fs.readFileSync(path.join(packageRoot, "requirements", "coverage-crosswalk.csv"), "utf8").trim().split(/\r?\n/);
const rows = csv.slice(1).map(line => {
  const [id, layer, status] = line.split(",", 3);
  return { id, layer, status };
});
const ids = new Set(rows.map(row => row.id));
const statusCounts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

const checks = {
  testFiles: testFiles.length === manifest.expected.testFiles,
  tests: testCount === manifest.expected.tests,
  noFocusedOrSkippedTests: forbiddenFocusedTests === 0,
  requirements: rows.length === manifest.expected.requirements,
  uniqueRequirementIds: ids.size === rows.length,
  statusCounts: Object.entries(manifest.expected.statusCounts).every(([key, value]) => statusCounts[key] === value),
  evidencePaths: manifest.evaluationBoundary.contracts.every(relative => fs.existsSync(path.join(repoRoot, relative))),
};

const result = {
  commit: process.env.GITHUB_SHA || "local-working-tree",
  observed: { testFiles: testFiles.length, tests: testCount, requirements: rows.length, statusCounts },
  expected: manifest.expected,
  checks,
  passed: Object.values(checks).every(Boolean),
};

const outputDir = path.join(packageRoot, "results", "generated");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "manifest-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
