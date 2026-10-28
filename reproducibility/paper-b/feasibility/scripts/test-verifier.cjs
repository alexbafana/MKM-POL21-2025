const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawnSync } = require("node:child_process");
const src = path.resolve(__dirname, "../results"),
  cases = [];
for (const type of ["receipt", "content", "model"]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "woodhive-integrity-"));
  fs.cpSync(src, dir, { recursive: true });
  try {
    if (type === "receipt") {
      const f = path.join(dir, "local-store/receipt.json"),
        r = JSON.parse(fs.readFileSync(f));
      r.proposalId = "0";
      fs.writeFileSync(f, JSON.stringify(r));
    }
    if (type === "content") {
      const f = fs
        .readdirSync(path.join(dir, "local-store"))
        .find((x) => x.endsWith(".nq"));
      const p = path.join(dir, "local-store", f);
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace('"120"', '"150"'));
    }
    if (type === "model") {
      const f = path.join(dir, "model-runtime.json"),
        r = JSON.parse(fs.readFileSync(f));
      r.policy.quorum = 1;
      fs.writeFileSync(f, JSON.stringify(r));
    }
    const r = spawnSync(
      process.execPath,
      [path.join(__dirname, "verify.cjs")],
      {
        env: { ...process.env, PAPER_B_FEASIBILITY_VERIFY: dir },
        encoding: "utf8",
      },
    );
    const expected = {
      receipt: "Receipt digest mismatch",
      content: "Published content mismatch",
      model: "Model manifest hash mismatch",
    }[type];
    if (r.status === 0 || !r.stderr.includes(expected))
      throw new Error(
        `${type}: tampering not rejected as expected: ${r.stderr}`,
      );
    cases.push({ case: type, passed: true, diagnostic: r.stderr.trim() });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
fs.writeFileSync(
  path.join(src, "negative-integrity.json"),
  JSON.stringify({ passed: true, cases }, null, 2) + "\n",
);
console.log(JSON.stringify({ passed: true, cases: cases.length }));
