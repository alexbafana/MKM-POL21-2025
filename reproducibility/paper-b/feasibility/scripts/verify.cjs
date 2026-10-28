const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { ethers } = require("ethers"),
  rdf = require("rdf-canonize");
const out =
  process.env.PAPER_B_FEASIBILITY_VERIFY ||
  path.resolve(__dirname, "../results");
const models = path.resolve(__dirname, "../../models");
const stable = (x) =>
  JSON.stringify(x, (_k, v) =>
    v && !Array.isArray(v) && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
const sha = (s) => ethers.sha256(ethers.toUtf8Bytes(s));
(async () => {
  const runtime = JSON.parse(
      fs.readFileSync(path.join(out, "model-runtime.json")),
    ),
    execution = JSON.parse(fs.readFileSync(path.join(out, "execution.json")));
  const manifest = Object.fromEntries(
    [
      "profile",
      "sourceHashes",
      "derivedInstanceHash",
      "plan",
      "policy",
      "mandates",
      "bindings",
    ].map((k) => [k, runtime[k]]),
  );
  assert.equal(
    sha(stable(manifest)),
    runtime.modelHash,
    "Model manifest hash mismatch",
  );
  for (const [f, h] of Object.entries(runtime.sourceHashes))
    assert.equal(
      sha(fs.readFileSync(path.join(models, f), "utf8")),
      h,
      `Source changed: ${f}`,
    );
  assert.equal(
    sha(stable(runtime.plan)),
    runtime.planHash,
    "Plan hash mismatch",
  );
  assert.equal(
    sha(stable(runtime.policy)),
    runtime.policyHash,
    "Policy hash mismatch",
  );
  const receipt = JSON.parse(
    fs.readFileSync(path.join(out, "local-store/receipt.json")),
  );
  const { receiptHash, confirmationTransaction, ...payload } = receipt;
  assert.equal(sha(stable(payload)), receiptHash, "Receipt digest mismatch");
  assert.match(confirmationTransaction, /^0x[0-9a-f]{64}$/);
  const canonical = await rdf.canonize(
    fs.readFileSync(
      path.join(out, "local-store", `${receipt.contentHash}.nq`),
      "utf8",
    ),
    {
      algorithm: "RDFC-1.0",
      inputFormat: "application/n-quads",
      maxWorkFactor: 1,
    },
  );
  assert.equal(
    sha(canonical),
    receipt.contentHash,
    "Published content mismatch",
  );
  for (const k of ["modelHash", "planHash", "policyHash"])
    assert.equal(runtime[k], receipt[k], `Runtime/receipt ${k} mismatch`);
  assert.equal(execution.receiptHash, receiptHash);
  assert.equal(execution.decisionId, receipt.proposalId);
  assert.equal(execution.assetId, receipt.assetId);
  assert.equal(execution.contentHash, receipt.contentHash);
  assert.equal(execution.confirmedEvent.decisionId, receipt.proposalId);
  assert.equal(execution.confirmedEvent.receiptHash, receiptHash);
  assert.equal(execution.confirmedEvent.contentHash, receipt.contentHash);
  assert.equal(execution.confirmedEvent.executor, receipt.executor);
  assert.equal(execution.institutionalConfirmation, false);
  assert.equal(runtime.bindings.length, 14);
  console.log(
    JSON.stringify(
      {
        passed: true,
        modelBindings: 14,
        contentHash: receipt.contentHash,
        modelHash: runtime.modelHash,
        receiptHash,
        scope:
          "Offline artifact-integrity check; chain state/event assertions are executed by the integration test, not replayed here.",
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
