import fs from "node:fs/promises";
import path from "node:path";
import { ethers } from "ethers";
import { canonicalize, validateFixture } from "../publication/adapter";
export const root = path.resolve(__dirname, "../../../..");
export const modelDir = path.join(root, "reproducibility/paper-b/models");
export const sha = (s: string) => ethers.sha256(ethers.toUtf8Bytes(s));
export const stable = (x: any): string =>
  JSON.stringify(x, (_k, v) =>
    v && !Array.isArray(v) && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map(k => [k, v[k]]),
        )
      : v,
  );
export async function loadModel() {
  return JSON.parse(await fs.readFile(path.join(modelDir, "WoodHive.institutional.json"), "utf8"));
}
export async function compileModel(m: any) {
  const fail = (condition: boolean, why: string) => {
    if (!condition) throw new Error(why);
  };
  fail(m.illustrative === true && m.asset.id === "urn:woodhive:graph:employment", "Unsupported model asset");
  fail(
    m.plan.asset === m.asset.id &&
      m.authorization.plan === m.plan.id &&
      m.decision.plan === m.plan.id &&
      m.binding.plan === m.plan.id,
    "Model plan links mismatch",
  );
  fail(
    m.plan.steps.length === 1 &&
      stable(m.plan.steps[0]) ===
        stable({ version: "v1", operation: "publish", source: "validated", target: "published" }),
    "Single publication plan required",
  );
  fail(m.evidence.canonicalization === "RDFC-1.0" && m.evidence.hash === "SHA-256", "Unsupported content profile");
  fail(
    m.policy.quorum === 2 &&
      m.policy.threshold === 1 &&
      m.policy.min_independent_principals === 2 &&
      m.safeguards.monitor.max_authority_share === 0.5,
    "Unsupported committee policy",
  );
  fail(
    stable(m.committee_members["C-Publication"]) === stable(["Institution-B", "Institution-C"]) &&
      stable(m.decision.participants) === stable(["Institution-B", "Institution-C"]),
    "Independent model principals required",
  );
  fail(
    m.authorization.executor === "Institution-A" &&
      m.roles.Producer === "Institution-A" &&
      m.roles.Validator === "Institution-B" &&
      m.roles.Executor === "Institution-A",
    "Model role mismatch",
  );
  for (const id of ["Institution-A", "Institution-B", "Institution-C"]) {
    const v = m.mandates.find((x: any) => x.principal === id);
    fail(!!v && v.scope === m.asset.class && v.valid_until > v.valid_from, "Scoped mandate required");
  }
  for (const [subject, action] of [
    ["R-Producer", "propose"],
    ["R-Validator", "validate"],
    ["R-Authorizer", "authorize"],
    ["R-Executor", "execute"],
  ])
    fail(
      m.permissions.some(
        (p: any) =>
          p.subject === subject && p.asset === m.asset.id && p.transition === "publish" && p.action === action,
      ),
      "Scoped permission required",
    );
  for (const n of [m.policy.voting_blocks, m.policy.execution_delay_blocks, m.authorization.expires])
    fail(Number.isSafeInteger(n) && n > 0, "Positive block bound required");
  fail(
    m.authorization.expires > m.policy.voting_blocks + m.policy.execution_delay_blocks + 10,
    "Execution window too short",
  );
  const profile = JSON.parse(await fs.readFile(path.join(modelDir, "institutional-profile.json"), "utf8"));
  const ontology = await fs.readFile(path.join(modelDir, "DAOMod_Institutional_Integrated.rdf"), "utf8");
  const selected = [
    "OLR1",
    "OLR5",
    "OLR7",
    "CR1",
    "CR2",
    "CR3",
    "CR4",
    "ER1",
    "ER2",
    "ER3",
    "ER4",
    "ER5",
    "ER6",
    "SG1",
  ];
  const views = await Promise.all(
    ["Organization", "Coordination", "Execution", "Safeguard"].map(v =>
      fs.readFile(path.join(modelDir, `extended-views/WoodHive_${v}.xml`), "utf8"),
    ),
  );
  const bindings = await Promise.all(
    selected.map(async req => {
      const item = profile.elements.find((x: any) => x.requirement === req);
      fail(!!item, "Missing requirement binding");
      const uri = `urn:paper-b:institutional-daomod:${item.id}`;
      fail(ontology.includes(`rdf:about="${uri}"`), "Missing ontology class");
      const view = views.find(v => v.includes(`ontologyClass="${uri}" requirement="${req}"`));
      fail(!!view, "Missing explicit view binding");
      const value = item.worked_case_pointer
        .split("/")
        .slice(1)
        .reduce((o: any, k: string) => o?.[k], m);
      fail(value !== undefined, "Missing model instance pointer");
      const base = await fs.readFile(path.join(modelDir, item.base_model), "utf8");
      fail(
        ["id", "DAO_ID", "permission_ID"].some(key => base.includes(`${key}="${item.base_element}"`)),
        "Missing base model element",
      );
      return {
        requirement: req,
        ontologyClass: uri,
        baseModel: item.base_model,
        baseElement: item.base_element,
        casePointer: item.worked_case_pointer,
        scope: "selected clauses only",
      };
    }),
  );
  const files = [
    "DAOMod_Institutional_Integrated.rdf",
    "institutional-profile.json",
    "WoodHive.institutional.json",
    "WoodHive_DAO-ML.model.xml",
    "WoodHive_ET-DM.model.xml",
    ...["Organization", "Coordination", "Execution", "Safeguard"].map(v => `extended-views/WoodHive_${v}.xml`),
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(files.map(async f => [f, sha(await fs.readFile(path.join(modelDir, f), "utf8"))])),
  );
  const manifest = {
    profile: "WoodHive-single-publication-feasibility-v1",
    sourceHashes,
    derivedInstanceHash: sha(stable(m)),
    plan: m.plan,
    policy: m.policy,
    mandates: m.mandates,
    bindings,
  };
  return {
    model: m,
    manifest,
    modelHash: sha(stable(manifest)),
    planHash: sha(stable(m.plan)),
    policyHash: sha(stable(m.policy)),
    assetKey: sha(`${m.asset.id}:v1`),
  };
}
export async function observedEvidence(source: string, modelHash: string) {
  const v = await validateFixture(source);
  const canonical = await canonicalize(source);
  const evidence = {
    profile: "WoodHive-narrow-fixture-validation-v1",
    canonicalization: "RDFC-1.0",
    hashMethod: "SHA-256",
    contentHash: sha(canonical),
    modelHash,
    syntaxValid: v.syntaxValid,
    semanticValid: v.semanticValid,
  };
  return { ...evidence, evidenceHash: sha(stable(evidence)), canonical };
}
export async function publish(
  registry: any,
  executor: any,
  id: string,
  source: string,
  directory: string,
  compiled: any,
) {
  const a = await registry.assets(id);
  if (Number(a.state) !== 4) throw new Error("Recorded admission required");
  const cfg = await registry.config();
  if (
    cfg.modelHash !== compiled.modelHash ||
    cfg.planHash !== compiled.planHash ||
    cfg.policyHash !== compiled.policyHash
  )
    throw new Error("Runtime model commitment mismatch");
  if (executor.address.toLowerCase() !== cfg.executor.toLowerCase() || !(await registry.mandateValid(executor.address)))
    throw new Error("Executor mandate required");
  if (BigInt(await executor.provider.getBlockNumber()) > a.deadline)
    throw new Error("Authorization expired before write");
  const canonical = await canonicalize(source),
    contentHash = sha(canonical);
  if (contentHash !== a.contentHash) throw new Error("Approved-content mismatch");
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `${contentHash}.nq`);
  try {
    await fs.writeFile(file, canonical, { flag: "wx" });
  } catch (e: any) {
    if (e.code !== "EEXIST") throw e;
  }
  const observed = sha(await canonicalize(await fs.readFile(file, "utf8")));
  if (observed !== contentHash) throw new Error("Read-back mismatch");
  const receipt = {
    profile: "WoodHive-single-publication-receipt-v1",
    chainId: (await executor.provider.getNetwork()).chainId.toString(),
    registry: await registry.getAddress(),
    assetId: id,
    proposalId: a.proposalId.toString(),
    modelHash: compiled.modelHash,
    planHash: compiled.planHash,
    policyHash: compiled.policyHash,
    evidenceHash: a.evidenceHash,
    contentHash,
    observedHash: observed,
    publicationId: contentHash,
    executor: executor.address,
  };
  const receiptHash = sha(stable(receipt));
  const tx = await registry.connect(executor).confirm(id, a.proposalId, observed, contentHash, receiptHash);
  const chainReceipt = await tx.wait();
  const saved = { ...receipt, receiptHash, confirmationTransaction: chainReceipt.hash };
  await fs.writeFile(path.join(directory, "receipt.json"), JSON.stringify(saved, null, 2));
  return { receipt: saved, chainReceipt, file };
}
