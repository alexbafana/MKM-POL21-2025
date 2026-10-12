import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalize, digest, publishAndConfirm, validateFixture } from "./adapter";

const root = path.resolve(__dirname, "../../../..");
const fixtureFile = path.join(root, "reproducibility/paper-b/publication/fixtures/employment.nq");
describe("Paper B supplemental decision-to-publication episode", function () {
  let producer: any, validator: any, publisher: any, outsider: any, voters: any[];
  let registry: any, committee: any, source: string, contentHash: string, assetId: string;
  let targets: string[], calls: string[], descriptionHash: string, proposalId: bigint, deadline: number, store: string;
  const description = "Publish exact synthetic employment graph version 1 after both validation results";
  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [producer, validator, publisher, outsider] = signers;
    voters = signers.slice(4, 7);
    store = await fs.mkdtemp(path.join(os.tmpdir(), "paper-b-publication-"));
    const permission = await (await ethers.getContractFactory("MKMPOL21")).deploy();
    const token = await (
      await ethers.getContractFactory("VotingPowerToken")
    ).deploy("Review votes", "REV", producer.address);
    committee = await (
      await ethers.getContractFactory("ValidationCommittee")
    ).deploy(await token.getAddress(), await permission.getAddress(), 0, 8, 34);
    for (const voter of voters) {
      await permission.assignRole(voter.address, 1156);
      await token.mint(voter.address, ethers.parseEther("1"));
    }
    registry = await (
      await ethers.getContractFactory("BoundPublication")
    ).deploy(producer.address, validator.address, await committee.getAddress(), publisher.address);
    source = await fs.readFile(fixtureFile, "utf8");
    contentHash = digest(await canonicalize(source));
    const network = await ethers.provider.getNetwork();
    const dataset = ethers.id("PaperB:synthetic-employment");
    assetId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "bytes32", "uint64"],
        [network.chainId, await registry.getAddress(), dataset, 1],
      ),
    );
    await registry.submit(dataset, 1, contentHash, ethers.id("synthetic-model-v1"));
    deadline = (await time.latest()) + 3600;
    descriptionHash = ethers.id(description);
    targets = [await registry.getAddress()];
    calls = [registry.interface.encodeFunctionData("authorize", [assetId, deadline, descriptionHash])];
    proposalId = await committee.hashProposal(targets, [0], calls, descriptionHash);
  });
  afterEach(async function () {
    await fs.rm(store, { recursive: true, force: true });
  });
  async function validate() {
    const v = await validateFixture(source);
    await registry.connect(validator).validate(assetId, v.syntaxValid, v.semanticValid, v.evidenceHash);
  }
  async function decide(voteCount = 2) {
    await committee.connect(voters[0]).propose(targets, [0], calls, description);
    await mine(1);
    for (let i = 0; i < voteCount; i++) await committee.connect(voters[i]).castVote(proposalId, 1);
    await mine(10);
  }
  async function authorize() {
    await validate();
    await decide();
    await committee.execute(targets, [0], calls, descriptionHash);
  }
  it("publishes canonical RDF, reads it back, and links the exact committee decision to an attributable receipt", async function () {
    await authorize();
    expect(await committee.state(proposalId)).to.equal(7);
    expect((await registry.assets(assetId)).proposalId).to.equal(proposalId);
    const result = await publishAndConfirm(registry, publisher, assetId, source, store);
    const asset = await registry.assets(assetId);
    expect(asset.state).to.equal(4);
    expect(asset.receiptHash).to.equal(result.receiptHash);
    expect(digest(await canonicalize(await fs.readFile(result.filename, "utf8")))).to.equal(asset.contentHash);
    const event = result.receipt.logs
      .map((l: any) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "Confirmed");
    expect(event.args.assetId).to.equal(assetId);
    expect(event.args.proposalId).to.equal(proposalId);
    expect(event.args.publicationId).to.equal(contentHash);
    expect(event.args.receiptHash).to.equal(result.receiptHash);
    expect(event.args.adapter).to.equal(publisher.address);
    if (process.env.PAPER_B_PUBLICATION_RESULTS) {
      await fs.mkdir(process.env.PAPER_B_PUBLICATION_RESULTS, { recursive: true });
      await fs.cp(store, path.join(process.env.PAPER_B_PUBLICATION_RESULTS, "local-store"), { recursive: true });
    }
  });
  it("rejects direct approval by a producer or other permission holder", async function () {
    await validate();
    await expect(registry.authorize(assetId, deadline, descriptionHash)).to.be.revertedWith("Governor only");
  });
  it("rejects a relay-wrapped decision that does not match the exact single-call authorization plan", async function () {
    await validate();
    const wrapped = [committee.interface.encodeFunctionData("relay", [await registry.getAddress(), 0, calls[0]])];
    const wrappedTargets = [await committee.getAddress()];
    const id = await committee.hashProposal(wrappedTargets, [0], wrapped, descriptionHash);
    await committee.connect(voters[0]).propose(wrappedTargets, [0], wrapped, description);
    await mine(1);
    await committee.connect(voters[0]).castVote(id, 1);
    await committee.connect(voters[1]).castVote(id, 1);
    await mine(10);
    await expect(committee.execute(wrappedTargets, [0], wrapped, descriptionHash)).to.be.revertedWith(
      "Governor: unknown proposal id",
    );
    expect((await registry.assets(assetId)).state).to.equal(2);
  });
  it("rejects execution without sufficient committee quorum", async function () {
    await validate();
    await decide(1);
    expect(await committee.state(proposalId)).to.equal(3);
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith(
      "Governor: proposal not successful",
    );
    expect((await registry.assets(assetId)).state).to.equal(2);
  });
  it("rejects publication before a committee authorization", async function () {
    await validate();
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId, contentHash, contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Authorization required");
    try {
      await publishAndConfirm(registry, publisher, assetId, source, store);
      expect.fail("publication succeeded");
    } catch (e: any) {
      expect(e.message).to.equal("Authorization required before publication");
    }
    expect(await fs.readdir(store)).to.deep.equal([]);
  });
  it("rejects semantic failure even when syntax passes", async function () {
    await expect(registry.connect(validator).validate(assetId, true, false, ethers.id("evidence"))).to.be.revertedWith(
      "Both validations required",
    );
    await decide();
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith("Validated required");
  });
  it("rejects syntax failure even when a semantic flag passes", async function () {
    await expect(registry.connect(validator).validate(assetId, false, true, ethers.id("evidence"))).to.be.revertedWith(
      "Both validations required",
    );
  });
  it("rejects producer self-validation", async function () {
    await expect(registry.validate(assetId, true, true, ethers.id("evidence"))).to.be.revertedWith("Validator only");
  });
  it("rejects a duplicate immutable asset version", async function () {
    await expect(
      registry.submit(ethers.id("PaperB:synthetic-employment"), 1, ethers.id("changed"), ethers.id("changed-model")),
    ).to.be.revertedWith("Version exists");
  });
  it("rejects changes to validation evidence after authorization", async function () {
    await authorize();
    await expect(
      registry.connect(validator).validate(assetId, true, true, ethers.id("replacement")),
    ).to.be.revertedWith("Candidate required");
  });
  it("rejects publication bytes that differ from the approved graph", async function () {
    await authorize();
    try {
      await publishAndConfirm(registry, publisher, assetId, source.replace("job-gain", "job-loss"), store);
      expect.fail("publication succeeded");
    } catch (e: any) {
      expect(e.message).to.equal("Approved-content mismatch before publication");
    }
    expect(await fs.readdir(store)).to.deep.equal([]);
  });
  it("rejects a corrupted object found on publication read-back", async function () {
    await authorize();
    await fs.writeFile(path.join(store, `${contentHash}.nq`), source.replace("job-gain", "job-loss"));
    try {
      await publishAndConfirm(registry, publisher, assetId, source, store);
      expect.fail("publication succeeded");
    } catch (e: any) {
      expect(e.message).to.equal("Publication read-back mismatch");
    }
    expect((await registry.assets(assetId)).state).to.equal(3);
  });
  it("rejects a receipt for another decision", async function () {
    await authorize();
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId + 1n, contentHash, contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Decision mismatch");
  });
  it("rejects a receipt with a different published-content identifier", async function () {
    await authorize();
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId, contentHash, ethers.id("other"), ethers.id("receipt")),
    ).to.be.revertedWith("Content mismatch");
  });
  it("rejects an unappointed publisher before writing any object", async function () {
    await authorize();
    try {
      await publishAndConfirm(registry, outsider, assetId, source, store);
      expect.fail("publication succeeded");
    } catch (e: any) {
      expect(e.message).to.equal("Appointed adapter required before publication");
    }
    expect(await fs.readdir(store)).to.deep.equal([]);
  });
  it("rejects confirmation by an unappointed adapter", async function () {
    await authorize();
    await expect(
      registry.connect(outsider).confirm(assetId, proposalId, contentHash, contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Adapter only");
  });
  it("rejects an empty receipt", async function () {
    await authorize();
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId, contentHash, contentHash, ethers.ZeroHash),
    ).to.be.revertedWith("Receipt required");
  });
  it("rejects replay after a confirmed publication", async function () {
    await authorize();
    const result = await publishAndConfirm(registry, publisher, assetId, source, store);
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId, contentHash, contentHash, result.receiptHash),
    ).to.be.revertedWith("Authorization required");
    await expect(committee.execute(targets, [0], calls, descriptionHash)).to.be.revertedWith(
      "Governor: proposal not successful",
    );
  });
  it("rejects expired authorization before writing and at confirmation", async function () {
    await authorize();
    await time.increaseTo(deadline + 1);
    try {
      await publishAndConfirm(registry, publisher, assetId, source, store);
      expect.fail("publication succeeded");
    } catch (e: any) {
      expect(e.message).to.equal("Authorization expired before publication");
    }
    expect(await fs.readdir(store)).to.deep.equal([]);
    await expect(
      registry.connect(publisher).confirm(assetId, proposalId, contentHash, contentHash, ethers.id("receipt")),
    ).to.be.revertedWith("Authorization expired");
  });
  it("canonicalizes equivalent blank-node identifiers and ordering to the same approved digest", async function () {
    const a = '_:a <urn:p> _:b .\n_:b <urn:q> "value" .\n';
    const b = '_:y <urn:q> "value" .\n_:x <urn:p> _:y .\n';
    expect(digest(await canonicalize(a))).to.equal(digest(await canonicalize(b)));
  });
  it("detects a syntactically valid graph outside the fixture semantic rule", async function () {
    const result = await validateFixture(source.replace("job-gain", "unsupported-class"));
    expect(result.syntaxValid).to.equal(true);
    expect(result.semanticValid).to.equal(false);
  });
  it("rejects invalid N-Quads at the adapter boundary", async function () {
    let failed = false;
    try {
      await canonicalize("not RDF");
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });
});
