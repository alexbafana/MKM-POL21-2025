import { expect } from "chai";
import { ethers } from "hardhat";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalize } from "../publication/adapter";
import { root, loadModel, compileModel, observedEvidence, publish, sha } from "./modelRuntime";

describe("Paper B model-linked WoodHive feasibility prototype", function () {
  let m: any,
    c: any,
    a: any,
    b: any,
    d: any,
    outsider: any,
    registry: any,
    committee: any,
    source: string,
    id: string,
    evidence: any,
    store: string;
  let calls: string[],
    targets: string[],
    description: string,
    descriptionHash: string,
    decision: bigint,
    deadline: number;
  beforeEach(async function () {
    m = await loadModel();
    c = await compileModel(m);
    [a, b, d, outsider] = await ethers.getSigners();
    store = await fs.mkdtemp(path.join(os.tmpdir(), "woodhive-feasibility-"));
    source = await fs.readFile(path.join(root, "reproducibility/paper-b/feasibility/fixtures/woodhive.nq"), "utf8");
    evidence = await observedEvidence(source, c.modelHash);
    const permission = await (await ethers.getContractFactory("MKMPOL21")).deploy();
    const token = await (
      await ethers.getContractFactory("VotingPowerToken")
    ).deploy("Model publication votes", "MPV", a.address);
    committee = await (
      await ethers.getContractFactory("ModelPublicationCommittee")
    ).deploy(await token.getAddress(), await permission.getAddress(), m.policy.voting_blocks);
    for (const voter of [b, d]) {
      await permission.assignRole(voter.address, 1156);
      await token.mint(voter.address, ethers.parseEther("1"));
    }
    const base = await ethers.provider.getBlockNumber();
    const mandates = ["Institution-A", "Institution-B", "Institution-C"].map(x =>
      m.mandates.find((v: any) => v.principal === x),
    );
    registry = await (
      await ethers.getContractFactory("ModelBoundPublication")
    ).deploy({
      modelHash: c.modelHash,
      planHash: c.planHash,
      policyHash: c.policyHash,
      assetKey: c.assetKey,
      producer: a.address,
      validator: b.address,
      executor: a.address,
      governor: await committee.getAddress(),
      voters: [b.address, d.address],
      validFrom: mandates.map((v: any) => base + v.valid_from),
      validUntil: mandates.map((v: any) => base + v.valid_until),
      delayBlocks: m.policy.execution_delay_blocks,
      ttlBlocks: m.authorization.expires,
    });
    const net = await ethers.provider.getNetwork();
    id = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "bytes32"],
        [net.chainId, await registry.getAddress(), c.assetKey],
      ),
    );
    await registry.submit(evidence.contentHash);
    deadline = (await ethers.provider.getBlockNumber()) + m.authorization.expires;
    description = `WoodHive ${m.plan.id}: model ${c.modelHash}`;
    descriptionHash = ethers.id(description);
    targets = [await registry.getAddress()];
    calls = [
      registry.interface.encodeFunctionData("authorize", [
        id,
        deadline,
        descriptionHash,
        c.planHash,
        evidence.evidenceHash,
      ]),
    ];
    decision = await committee.hashProposal(targets, [0], calls, descriptionHash);
  });
  afterEach(async () => {
    if (store) await fs.rm(store, { recursive: true, force: true });
  });
  async function validate() {
    await registry.connect(b).validate(id, evidence.syntaxValid, evidence.semanticValid, evidence.evidenceHash);
  }
  async function vote(voters = [b, d], supports = [1, 1]) {
    await committee.connect(b).propose(targets, [0], calls, description);
    await mine(1);
    for (let i = 0; i < voters.length; i++) await committee.connect(voters[i]).castVote(decision, supports[i]);
    await mine(m.policy.voting_blocks + 1);
  }
  async function authorize() {
    await validate();
    await vote();
    await committee.execute(targets, [0], calls, descriptionHash);
  }
  async function admit() {
    await authorize();
    await mine(m.policy.execution_delay_blocks);
    await registry.admit(id, c.planHash, evidence.evidenceHash);
  }
  async function rejects(action: () => Promise<any>, message: string) {
    try {
      await action();
      expect.fail("Expected failure");
    } catch (e: any) {
      expect(e.message).to.contain(message);
    }
  }
  it("executes model-derived committee approval, admission, RDF read-back and on-chain receipt confirmation", async () => {
    await admit();
    const result = await publish(registry, a, id, source, store, c);
    const state = await registry.assets(id);
    expect(state.state).to.equal(5);
    expect(state.receiptHash).to.equal(result.receipt.receiptHash);
    expect(state.proposalId).to.equal(decision);
    const event = result.chainReceipt.logs
      .map((l: any) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((v: any) => v?.name === "Confirmed");
    expect(event.args.decisionId).to.equal(decision);
    expect(event.args.contentHash).to.equal(evidence.contentHash);
    expect(event.args.executor).to.equal(a.address);
    expect(sha(await canonicalize(await fs.readFile(result.file, "utf8")))).to.equal(state.contentHash);
    if (process.env.PAPER_B_FEASIBILITY_RESULTS) {
      const out = process.env.PAPER_B_FEASIBILITY_RESULTS;
      await fs.mkdir(out, { recursive: true });
      await fs.cp(store, path.join(out, "local-store"), { recursive: true });
      await fs.writeFile(
        path.join(out, "model-runtime.json"),
        JSON.stringify(
          {
            ...c.manifest,
            modelHash: c.modelHash,
            planHash: c.planHash,
            policyHash: c.policyHash,
            assetKey: c.assetKey,
            principalAddresses: { "Institution-A": a.address, "Institution-B": b.address, "Institution-C": d.address },
            deployment: await registry.getAddress(),
            runtimeTiming:
              "mandate intervals offset from deployment; expires interpreted as execution-window bound in blocks",
          },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(out, "execution.json"),
        JSON.stringify(
          {
            state: "technically-confirmed",
            institutionalConfirmation: false,
            decisionId: decision.toString(),
            assetId: id,
            receiptHash: state.receiptHash,
            contentHash: state.contentHash,
            validationEvidence: evidence,
            confirmedEvent: {
              decisionId: event.args.decisionId.toString(),
              contentHash: event.args.contentHash,
              receiptHash: event.args.receiptHash,
              executor: event.args.executor,
            },
            selectedRequirementBindings: c.manifest.bindings,
          },
          null,
          2,
        ),
      );
    }
  });
  it("rejects single-voter approval under the two-principal unanimous model policy", async () => {
    await validate();
    await vote([b], [1]);
    expect(await committee.state(decision)).to.equal(3);
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith(
      "Governor: proposal not successful",
    );
  });
  it("rejects a split decision under the unanimous model policy", async () => {
    await validate();
    await vote([b, d], [1, 0]);
    expect(await committee.state(decision)).to.equal(3);
  });
  it("rejects direct authorization outside the model-selected committee", async () => {
    await validate();
    await expect(
      registry.authorize(id, deadline, descriptionHash, c.planHash, evidence.evidenceHash),
    ).to.be.revertedWith("Governor only");
  });
  it("rejects producer self-validation", async () => {
    await expect(registry.validate(id, true, true, evidence.evidenceHash)).to.be.revertedWith(
      "Validator mandate required",
    );
  });
  it("rejects failed semantic validation", async () => {
    await expect(registry.connect(b).validate(id, true, false, evidence.evidenceHash)).to.be.revertedWith(
      "Validation required",
    );
  });
  it("rejects an authorization with substituted evidence", async () => {
    await validate();
    calls = [
      registry.interface.encodeFunctionData("authorize", [
        id,
        deadline,
        descriptionHash,
        c.planHash,
        ethers.id("other"),
      ]),
    ];
    decision = await committee.hashProposal(targets, [0], calls, descriptionHash);
    await vote();
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith("Plan/evidence mismatch");
  });
  it("rejects an authorization with a substituted plan", async () => {
    await validate();
    calls = [
      registry.interface.encodeFunctionData("authorize", [
        id,
        deadline,
        descriptionHash,
        ethers.id("other"),
        evidence.evidenceHash,
      ]),
    ];
    decision = await committee.hashProposal(targets, [0], calls, descriptionHash);
    await vote();
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith("Plan/evidence mismatch");
  });
  it("enforces the model's five-block execution delay", async () => {
    await authorize();
    await expect(registry.admit(id, c.planHash, evidence.evidenceHash)).to.be.revertedWith("Outside execution window");
  });
  it("rejects expired authorization before admission", async () => {
    await authorize();
    await mine(m.authorization.expires + 1);
    await expect(registry.admit(id, c.planHash, evidence.evidenceHash)).to.be.revertedWith("Outside execution window");
  });
  it("rejects an expired executor mandate", async () => {
    await authorize();
    await mine(1001);
    await expect(registry.admit(id, c.planHash, evidence.evidenceHash)).to.be.revertedWith("Executor mandate required");
  });
  it("rejects expired authorizer mandates at authorization", async () => {
    await validate();
    await vote();
    await mine(1001);
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith(
      "Authorizer mandate required",
    );
  });
  it("rejects an unappointed executor", async () => {
    await authorize();
    await mine(5);
    await expect(registry.connect(outsider).admit(id, c.planHash, evidence.evidenceHash)).to.be.revertedWith(
      "Executor mandate required",
    );
  });
  it("reserves authorization against a second admission", async () => {
    await admit();
    await expect(registry.admit(id, c.planHash, evidence.evidenceHash)).to.be.revertedWith("Authorization required");
  });
  it("rejects changed job-count content before writing", async () => {
    await admit();
    await rejects(
      () => publish(registry, a, id, source.replace('"120"', '"150"'), store, c),
      "Approved-content mismatch",
    );
    expect(await fs.readdir(store)).to.deep.equal([]);
  });
  it("rejects corrupted content on read-back", async () => {
    await admit();
    await fs.writeFile(path.join(store, `${evidence.contentHash}.nq`), source.replace('"120"', '"150"'));
    await rejects(() => publish(registry, a, id, source, store, c), "Read-back mismatch");
    expect((await registry.assets(id)).state).to.equal(4);
  });
  it("rejects a receipt for another decision", async () => {
    await admit();
    await expect(
      registry.confirm(id, decision + 1n, evidence.contentHash, evidence.contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Decision mismatch");
  });
  it("rejects replay after confirmation", async () => {
    await admit();
    await publish(registry, a, id, source, store, c);
    await expect(
      registry.confirm(id, decision, evidence.contentHash, evidence.contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Admission required");
  });
  it("rejects a runtime model commitment mismatch", async () => {
    await admit();
    await rejects(
      () => publish(registry, a, id, source, store, { ...c, modelHash: ethers.id("changed-model") }),
      "Runtime model commitment mismatch",
    );
  });
  it("rejects a model with broken plan references", async () => {
    const bad = structuredClone(m);
    bad.authorization.plan = "other";
    await rejects(() => compileModel(bad), "Model plan links mismatch");
  });
  it("rejects a model that replaces independent principals with duplicate identities", async () => {
    const bad = structuredClone(m);
    bad.committee_members["C-Publication"] = ["Institution-B", "Institution-B"];
    await rejects(() => compileModel(bad), "Independent model principals required");
  });
  it("rejects a model missing the publication execution permission", async () => {
    const bad = structuredClone(m);
    bad.permissions = bad.permissions.filter((p: any) => p.action !== "execute");
    await rejects(() => compileModel(bad), "Scoped permission required");
  });
  it("rejects an unsupported model content-hash method", async () => {
    const bad = structuredClone(m);
    bad.evidence.hash = "unknown";
    await rejects(() => compileModel(bad), "Unsupported content profile");
  });
  it("accepts reordered equivalent RDF without changing the committed content hash", async () => {
    expect(sha(await canonicalize(source.split("\n").filter(Boolean).reverse().join("\n") + "\n"))).to.equal(
      evidence.contentHash,
    );
  });
  it("rejects a mismatched evidence manifest at admission", async () => {
    await authorize();
    await mine(5);
    await expect(registry.admit(id, c.planHash, ethers.id("other"))).to.be.revertedWith("Plan/evidence mismatch");
  });
  it("records an unconfirmed object when chain confirmation fails after the local write", async () => {
    await admit();
    const failing = {
      assets: (x: any) => registry.assets(x),
      config: () => registry.config(),
      mandateValid: (x: any) => registry.mandateValid(x),
      getAddress: () => registry.getAddress(),
      connect: () => ({
        confirm: async () => {
          throw new Error("Simulated chain failure");
        },
      }),
    };
    await rejects(() => publish(failing, a, id, source, store, c), "Simulated chain failure");
    expect((await registry.assets(id)).state).to.equal(4);
    expect(await fs.readdir(store)).to.deep.equal([`${evidence.contentHash}.nq`]);
  });
  it("rejects a duplicate immutable graph version", async () => {
    await expect(registry.submit(evidence.contentHash)).to.be.revertedWith("Version exists");
  });
  it("rejects receipt confirmation before recorded admission", async () => {
    await authorize();
    await expect(
      registry.confirm(id, decision, evidence.contentHash, evidence.contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Admission required");
  });
  it("rejects an empty receipt hash", async () => {
    await admit();
    await expect(
      registry.confirm(id, decision, evidence.contentHash, evidence.contentHash, ethers.ZeroHash),
    ).to.be.revertedWith("Receipt required");
  });
  it("rejects an observed content hash that differs from approval", async () => {
    await admit();
    await expect(
      registry.confirm(id, decision, ethers.id("wrong-content"), evidence.contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Content mismatch");
  });
  it("rejects one yes plus one abstention under the unanimous model policy", async () => {
    await validate();
    await vote([b, d], [1, 2]);
    expect(await committee.state(decision)).to.equal(3);
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith(
      "Governor: proposal not successful",
    );
  });
});
