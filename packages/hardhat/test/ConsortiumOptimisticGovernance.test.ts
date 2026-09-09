import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Consortium, GADataValidation, MKMPOL21, VotingPowerToken } from "../typechain-types";

/**
 * Consortium — optimistic governance protocol.
 *
 * Covers the governance requirements that were implemented but previously untested:
 *   R1.5  delegation of decision rights (grantPermission on proposal/veto bits)
 *   R1.6  veto rights (Section III-C, Figure 4)
 *   R1.7  revocation of decision rights
 *   R2.9  temporal constraints: review/objection (challenge) window (Section III-D, Table V)
 *   R2.11 binding a collective decision to a lifecycle transition (Section IV-C)
 *   R3.11 resistance to capture: adversarial paths around the safeguards (Section V-D)
 *
 * Permission bits used by Consortium.sol:
 *   28 — propose, 29 — veto (checked through IPermissionManager.canPropose / canVote)
 */
describe("Consortium - Optimistic Governance (R1.5-R1.7, R2.9, R2.11, R3.11)", function () {
  let mkmpol21: MKMPOL21;
  let consortium: Consortium;
  let gaDataValidation: GADataValidation;
  let token: VotingPowerToken;

  let owner: HardhatEthersSigner;
  let institutionA: HardhatEthersSigner;
  let institutionB: HardhatEthersSigner;
  let validator: HardhatEthersSigner;
  let ordinary: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const ROLE_MEMBER_INSTITUTION = 1152; // index 0 — permissions include 8 (submit), 28 (propose), 29 (veto)
  const ROLE_DATA_VALIDATOR = 1156; // index 4 — permissions include 4 (validate), 28, 29
  const ROLE_ORDINARY_USER = 1153; // index 1 — has neither 28 nor 29

  const PERM_PROPOSE = 28;
  const PERM_VETO = 29;

  const CHALLENGE_PERIOD = 3 * 24 * 60 * 60; // 3 days, same value as deploy/00_deploy_your_contract.ts

  // Lifecycle payload used to prove that a governance decision drives a lifecycle transition
  const graphURI = "urn:graph:articles";
  const graphHash = ethers.keccak256(ethers.toUtf8Bytes("sample RDF content"));
  const graphType = 0; // GraphType.ARTICLES
  const datasetVariant = 0; // DatasetVariant.ERR_ONLINE
  const year = 2024;
  const modelVersion = "EstBERT-1.0";

  let graphId: string;
  let targets: string[];
  let values: bigint[];
  let calldatas: string[];
  const description = "Mark ERR_ONLINE 2024 articles graph as validated";
  let descriptionHash: string;

  beforeEach(async function () {
    [owner, institutionA, institutionB, validator, ordinary, outsider] = await ethers.getSigners();

    token = await (
      await ethers.getContractFactory("VotingPowerToken")
    ).deploy("MKMPOL Voting Power", "MKMVP", owner.address);
    await token.waitForDeployment();

    mkmpol21 = await (await ethers.getContractFactory("MKMPOL21")).deploy();
    await mkmpol21.waitForDeployment();

    const mkmAddress = await mkmpol21.getAddress();
    const tokenAddress = await token.getAddress();

    gaDataValidation = await (await ethers.getContractFactory("GADataValidation")).deploy(mkmAddress, owner.address);
    await gaDataValidation.waitForDeployment();

    consortium = await (
      await ethers.getContractFactory("Consortium")
    ).deploy(tokenAddress, mkmAddress, CHALLENGE_PERIOD);
    await consortium.waitForDeployment();

    const validationCommittee = await (
      await ethers.getContractFactory("ValidationCommittee")
    ).deploy(tokenAddress, mkmAddress, 0, 30, 34);
    await validationCommittee.waitForDeployment();

    const disputeBoard = await (
      await ethers.getContractFactory("DisputeResolutionBoard")
    ).deploy(tokenAddress, mkmAddress);
    await disputeBoard.waitForDeployment();

    // Give the governance bodies their on-chain roles (Consortium -> role index 6)
    await mkmpol21
      .connect(owner)
      .initializeCommittees(
        await consortium.getAddress(),
        await validationCommittee.getAddress(),
        await disputeBoard.getAddress(),
      );

    // Governance participants
    await mkmpol21.connect(owner).assignRole(institutionA.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(institutionB.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(validator.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(ordinary.address, ROLE_ORDINARY_USER);
    // `outsider` deliberately keeps role 0 (no role at all)

    // Voting power must exist before any proposal snapshot is taken
    const oneToken = ethers.parseEther("1");
    await token.connect(owner).mint(institutionA.address, oneToken);
    await token.connect(owner).mint(institutionB.address, oneToken);
    await token.connect(owner).mint(validator.address, oneToken);

    // A knowledge graph in state "Created", waiting for a lifecycle decision
    const submitTx = await gaDataValidation
      .connect(institutionA)
      .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);
    const submitReceipt = await submitTx.wait();
    const submitted = submitReceipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
    graphId = submitted?.args?.[0];

    targets = [await gaDataValidation.getAddress()];
    values = [0n];
    calldatas = [gaDataValidation.interface.encodeFunctionData("markRDFGraphValidated", [graphId, true])];
    descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
  });

  /** Create a proposal and return its id. */
  async function propose(proposer: HardhatEthersSigner): Promise<bigint> {
    const tx = await consortium.connect(proposer).propose(targets, values, calldatas, description);
    await tx.wait();
    return consortium.hashProposal(targets, values, calldatas, descriptionHash);
  }

  /** Drive a proposal through voting so that it reaches the Succeeded state. */
  async function voteUntilSucceeded(proposalId: bigint, voters: HardhatEthersSigner[]): Promise<void> {
    await mine((await consortium.votingDelay()) + 1n);
    for (const voter of voters) {
      await consortium.connect(voter).castVote(proposalId, 1); // 1 = For
    }
    await mine((await consortium.votingPeriod()) + 1n);
    expect(await consortium.state(proposalId)).to.equal(4); // ProposalState.Succeeded
  }

  describe("[R1.3/R1.5] Proposal rights are permission-gated", function () {
    it("Member_Institution holding permission 28 can open a proposal", async function () {
      expect(await mkmpol21.has_permission(institutionA.address, PERM_PROPOSE)).to.equal(true);

      await expect(consortium.connect(institutionA).propose(targets, values, calldatas, description)).to.emit(
        consortium,
        "ProposalCreated",
      );
    });

    it("An address without any role cannot open a proposal", async function () {
      expect(await mkmpol21.hasRole(outsider.address)).to.equal(0);

      await expect(consortium.connect(outsider).propose(targets, values, calldatas, description)).to.be.revertedWith(
        "User cannot propose",
      );
    });

    it("A role that lacks permission 28 cannot open a proposal", async function () {
      expect(await mkmpol21.has_permission(ordinary.address, PERM_PROPOSE)).to.equal(false);

      await expect(consortium.connect(ordinary).propose(targets, values, calldatas, description)).to.be.revertedWith(
        "User does not have this permission",
      );
    });

    it("Delegating permission 28 to a role grants proposal rights to every holder of that role", async function () {
      await expect(consortium.connect(ordinary).propose(targets, values, calldatas, description)).to.be.reverted;

      await expect(mkmpol21.connect(owner).grantPermission(ROLE_ORDINARY_USER, PERM_PROPOSE))
        .to.emit(mkmpol21, "PermissionGranted")
        .withArgs(ROLE_ORDINARY_USER, PERM_PROPOSE);

      await expect(consortium.connect(ordinary).propose(targets, values, calldatas, description)).to.emit(
        consortium,
        "ProposalCreated",
      );
    });
  });

  describe("[R1.6] Veto rights", function () {
    it("A holder of permission 29 can veto inside the challenge window", async function () {
      const proposalId = await propose(institutionA);

      await consortium.connect(institutionB).vetoProposal(proposalId);

      const stored = await consortium.proposals(proposalId);
      expect(stored.vetoed).to.equal(true);
    });

    it("A role without permission 29 cannot veto", async function () {
      const proposalId = await propose(institutionA);

      expect(await mkmpol21.has_permission(ordinary.address, PERM_VETO)).to.equal(false);
      await expect(consortium.connect(ordinary).vetoProposal(proposalId)).to.be.revertedWith(
        "User does not have this permission",
      );
    });

    it("An address without any role cannot veto", async function () {
      const proposalId = await propose(institutionA);

      await expect(consortium.connect(outsider).vetoProposal(proposalId)).to.be.revertedWith("User cannot vote");
    });

    it("The same proposal cannot be vetoed twice", async function () {
      const proposalId = await propose(institutionA);
      await consortium.connect(institutionB).vetoProposal(proposalId);

      await expect(consortium.connect(validator).vetoProposal(proposalId)).to.be.revertedWith(
        "Proposal already vetoed",
      );
    });

    it("Revoking permission 29 removes the veto right from the whole role (R1.7)", async function () {
      const proposalId = await propose(institutionA);

      await expect(mkmpol21.connect(owner).revokePermission(ROLE_MEMBER_INSTITUTION, PERM_VETO))
        .to.emit(mkmpol21, "PermissionRevoked")
        .withArgs(ROLE_MEMBER_INSTITUTION, PERM_VETO);

      await expect(consortium.connect(institutionB).vetoProposal(proposalId)).to.be.revertedWith(
        "User does not have this permission",
      );

      // A Data_Validator still holds bit 29, so the veto right survives for other roles
      await consortium.connect(validator).vetoProposal(proposalId);
      expect((await consortium.proposals(proposalId)).vetoed).to.equal(true);
    });

    it("Revoking the role removes the proposal right from that account (R1.7)", async function () {
      await expect(mkmpol21.connect(owner).revokeRole(institutionB.address, ROLE_MEMBER_INSTITUTION))
        .to.emit(mkmpol21, "RoleRevoked")
        .withArgs(institutionB.address, ROLE_MEMBER_INSTITUTION);

      await expect(
        consortium.connect(institutionB).propose(targets, values, calldatas, description),
      ).to.be.revertedWith("User cannot propose");
    });

    it("Vetoing an unknown proposal is rejected by the window check, not by an existence check", async function () {
      // Documents current behaviour: proposals[unknown].creationTime == 0, so the challenge
      // window is already over and the call reverts with a misleading reason.
      const unknownId = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes("no such proposal")));

      await expect(consortium.connect(institutionA).vetoProposal(unknownId)).to.be.revertedWith(
        "Challenge period expired",
      );
    });
  });

  describe("[R2.9] Temporal constraints: the challenge window", function () {
    it("Records the creation time that opens the challenge window", async function () {
      const proposalId = await propose(institutionA);

      const stored = await consortium.proposals(proposalId);
      expect(stored.creationTime).to.equal(await time.latest());
      expect(stored.executed).to.equal(false);
      expect(await consortium.challengePeriod()).to.equal(CHALLENGE_PERIOD);
    });

    it("Rejects a veto once the challenge window has expired", async function () {
      const proposalId = await propose(institutionA);

      await time.increase(CHALLENGE_PERIOD + 1);

      await expect(consortium.connect(institutionB).vetoProposal(proposalId)).to.be.revertedWith(
        "Challenge period expired",
      );
    });

    it("Rejects optimistic execution before the challenge window is over", async function () {
      const proposalId = await propose(institutionA);
      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);

      // Voting is over, but the objection window still protects the decision
      await expect(
        consortium.connect(institutionA).executeProposal(targets, values, calldatas, descriptionHash),
      ).to.be.revertedWith("Challenge period not over");

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(false);
    });

    it("Rejects optimistic execution of a vetoed proposal", async function () {
      const proposalId = await propose(institutionA);
      await consortium.connect(institutionB).vetoProposal(proposalId);
      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);

      await time.increase(CHALLENGE_PERIOD + 1);

      await expect(
        consortium.connect(institutionA).executeProposal(targets, values, calldatas, descriptionHash),
      ).to.be.revertedWith("Vetoed");

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(false);
    });
  });

  describe("[R2.11] A collective decision drives the lifecycle transition", function () {
    it("Executes Created -> Validated on behalf of the Consortium once the window closes unchallenged", async function () {
      const proposalId = await propose(institutionA);
      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);
      await time.increase(CHALLENGE_PERIOD + 1);

      // The lifecycle event is attributed to the Consortium contract, not to a single actor (R3.1)
      await expect(consortium.connect(institutionA).executeProposal(targets, values, calldatas, descriptionHash))
        .to.emit(gaDataValidation, "RDFGraphValidated")
        .withArgs(graphId, true, await consortium.getAddress());

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(true);
      expect((await consortium.proposals(proposalId)).executed).to.equal(true);
      expect(await consortium.state(proposalId)).to.equal(7); // ProposalState.Executed
    });

    it("Refuses to execute the same proposal twice", async function () {
      const proposalId = await propose(institutionA);
      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);
      await time.increase(CHALLENGE_PERIOD + 1);

      await consortium.connect(institutionA).executeProposal(targets, values, calldatas, descriptionHash);

      await expect(
        consortium.connect(institutionA).executeProposal(targets, values, calldatas, descriptionHash),
      ).to.be.revertedWith("Already executed");
    });

    it("Cannot execute a decision the Consortium role is not authorized to carry out", async function () {
      // approveRDFGraph requires permission 6, which the Consortium role does not hold
      const approveCalldata = gaDataValidation.interface.encodeFunctionData("approveRDFGraph", [graphId]);
      const approveDescription = "Approve ERR_ONLINE 2024 articles graph";
      const approveDescriptionHash = ethers.keccak256(ethers.toUtf8Bytes(approveDescription));

      await consortium.connect(institutionA).propose(targets, values, [approveCalldata], approveDescription);
      const proposalId = await consortium.hashProposal(targets, values, [approveCalldata], approveDescriptionHash);

      await mine((await consortium.votingDelay()) + 1n);
      await consortium.connect(institutionA).castVote(proposalId, 1);
      await consortium.connect(institutionB).castVote(proposalId, 1);
      await mine((await consortium.votingPeriod()) + 1n);
      await time.increase(CHALLENGE_PERIOD + 1);

      await expect(
        consortium.connect(institutionA).executeProposal(targets, values, [approveCalldata], approveDescriptionHash),
      ).to.be.revertedWith("No permission to approve");

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(false);
    });
  });

  describe("[R3.11] Adversarial paths around the optimistic safeguards", function () {
    it("GUARD: the inherited Governor.execute() cannot bypass the veto or the challenge window", async function () {
      // Guards the fix for the bypass this test previously documented: Consortium overrides the
      // inherited public Governor.execute() so it applies the same !executed / challenge-period /
      // !vetoed checks as executeProposal. Without the override, any caller could execute a vetoed
      // proposal through Governor.execute() as soon as the Governor timeline completed.
      const proposalId = await propose(institutionA);
      await consortium.connect(institutionB).vetoProposal(proposalId);
      expect((await consortium.proposals(proposalId)).vetoed).to.equal(true);

      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);

      // No time.increase(): the challenge window is still open, so the window check fires first
      await expect(
        consortium.connect(ordinary).execute(targets, values, calldatas, descriptionHash),
      ).to.be.revertedWith("Challenge period not over");

      // Once the window closes, the veto itself blocks the inherited entry point
      await time.increase(CHALLENGE_PERIOD + 1);
      await expect(
        consortium.connect(ordinary).execute(targets, values, calldatas, descriptionHash),
      ).to.be.revertedWith("Vetoed");

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(false); // safeguard held
      expect((await consortium.proposals(proposalId)).executed).to.equal(false);
      expect(await consortium.state(proposalId)).to.equal(4); // still Succeeded, never Executed
    });

    it("GUARD: an unchallenged proposal still executes through the inherited entry point", async function () {
      // The override must block vetoed proposals without breaking IGovernor conformance: a clean
      // proposal executed through Governor.execute() must behave exactly like executeProposal.
      const proposalId = await propose(institutionA);
      await voteUntilSucceeded(proposalId, [institutionA, institutionB]);
      await time.increase(CHALLENGE_PERIOD + 1);

      await expect(consortium.connect(ordinary).execute(targets, values, calldatas, descriptionHash))
        .to.emit(gaDataValidation, "RDFGraphValidated")
        .withArgs(graphId, true, await consortium.getAddress());

      expect((await gaDataValidation.getGraphStatus(graphId)).validated).to.equal(true);
      // Both entry points now write the same bookkeeping flag
      expect((await consortium.proposals(proposalId)).executed).to.equal(true);
      expect(await consortium.state(proposalId)).to.equal(7); // ProposalState.Executed
    });

    it("GUARD: relay() is not an independent execution path", async function () {
      // Governor.relay is onlyGovernance (_executor() == address(this), no timelock), so it can only
      // be reached as the target of a proposal that already passed the guarded execute path.
      const payload = gaDataValidation.interface.encodeFunctionData("markRDFGraphValidated", [graphId, true]);

      await expect(
        consortium.connect(institutionA).relay(await gaDataValidation.getAddress(), 0, payload),
      ).to.be.revertedWith("Governor: onlyGovernance");
      await expect(
        consortium.connect(ordinary).relay(await gaDataValidation.getAddress(), 0, payload),
      ).to.be.revertedWith("Governor: onlyGovernance");

      expect((await gaDataValidation.getGraphStatus(graphId)).validated).to.equal(false);
    });

    it("GAP: quorum is 0%, so a single voter carries a proposal for the whole consortium", async function () {
      const proposalId = await propose(institutionA);

      await mine((await consortium.votingDelay()) + 1n);
      // Quorum is evaluated against the snapshot block, which only exists once voting opens
      expect(await consortium.quorum(await consortium.proposalSnapshot(proposalId))).to.equal(0);

      await consortium.connect(institutionA).castVote(proposalId, 1); // the proposer votes for itself
      await mine((await consortium.votingPeriod()) + 1n);

      expect(await consortium.state(proposalId)).to.equal(4); // Succeeded on one vote out of three
    });
  });
});
