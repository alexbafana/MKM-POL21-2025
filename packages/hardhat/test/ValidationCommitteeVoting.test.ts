import { expect } from "chai";
import { ethers } from "hardhat";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { GADataValidation, MKMPOL21, ValidationCommittee, VotingPowerToken } from "../typechain-types";

/**
 * ValidationCommittee — collective decision making bound to the graph lifecycle.
 *
 * Covers the requirements that were implemented but previously untested:
 *   R2.8  collective voting on validation decisions (Section IV-A, Table VI)
 *   R2.10 quorum rules (Section III-D, Table V)
 *   R2.11 binding a governance decision to the Validated -> Approved transition (Section IV-C)
 *   R3.1  attribution of the resulting lifecycle event to the governance body (Table X)
 *
 * Permission bits used by Validation_Committee.sol:
 *   30 — propose, 31 — vote (checked through IPermissionManager.canPropose / canVote)
 */
describe("ValidationCommittee - Collective Voting (R2.8, R2.10, R2.11)", function () {
  let mkmpol21: MKMPOL21;
  let committee: ValidationCommittee;
  let gaDataValidation: GADataValidation;
  let token: VotingPowerToken;

  let owner: HardhatEthersSigner;
  let institution: HardhatEthersSigner;
  let validator1: HardhatEthersSigner;
  let validator2: HardhatEthersSigner;
  let validator3: HardhatEthersSigner;
  let ordinary: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const ROLE_MEMBER_INSTITUTION = 1152; // index 0 — permission 8 (submit), 6 (approve), no 30/31
  const ROLE_DATA_VALIDATOR = 1156; // index 4 — permissions 4 (validate), 30, 31
  const ROLE_ORDINARY_USER = 1153; // index 1 — no governance permissions

  const PERM_APPROVE = 6;
  const PERM_PROPOSE = 30;
  const PERM_VOTE = 31;

  // Same parameters as deploy/00_deploy_your_contract.ts: no delay, 30 blocks of voting, 34% quorum
  const VOTING_DELAY = 0;
  const VOTING_PERIOD = 30;
  const QUORUM_PERCENT = 34;

  const VOTE_AGAINST = 0;
  const VOTE_FOR = 1;
  const VOTE_ABSTAIN = 2;

  // ProposalState
  const DEFEATED = 3;
  const SUCCEEDED = 4;
  const EXECUTED = 7;

  const graphURI = "urn:graph:articles";
  const graphHash = ethers.keccak256(ethers.toUtf8Bytes("sample RDF content"));
  const graphType = 0;
  const datasetVariant = 0;
  const year = 2024;
  const modelVersion = "EstBERT-1.0";

  let graphId: string;
  let targets: string[];
  let values: bigint[];
  let calldatas: string[];
  const description = "Approve ERR_ONLINE 2024 articles graph for publication";
  let descriptionHash: string;

  beforeEach(async function () {
    [owner, institution, validator1, validator2, validator3, ordinary, outsider] = await ethers.getSigners();

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

    committee = await (
      await ethers.getContractFactory("ValidationCommittee")
    ).deploy(tokenAddress, mkmAddress, VOTING_DELAY, VOTING_PERIOD, QUORUM_PERCENT);
    await committee.waitForDeployment();

    const consortium = await (
      await ethers.getContractFactory("Consortium")
    ).deploy(tokenAddress, mkmAddress, 3 * 24 * 60 * 60);
    await consortium.waitForDeployment();

    const disputeBoard = await (
      await ethers.getContractFactory("DisputeResolutionBoard")
    ).deploy(tokenAddress, mkmAddress);
    await disputeBoard.waitForDeployment();

    // The committee contract itself receives role index 7, whose permission set contains bit 6 (approve)
    await mkmpol21
      .connect(owner)
      .initializeCommittees(
        await consortium.getAddress(),
        await committee.getAddress(),
        await disputeBoard.getAddress(),
      );

    await mkmpol21.connect(owner).assignRole(institution.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(validator1.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(validator2.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(validator3.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(ordinary.address, ROLE_ORDINARY_USER);
    // `outsider` keeps role 0

    // Exactly one vote per committee member: total supply 3, quorum 34% => 1.02 votes required
    const oneToken = ethers.parseEther("1");
    await token.connect(owner).mint(validator1.address, oneToken);
    await token.connect(owner).mint(validator2.address, oneToken);
    await token.connect(owner).mint(validator3.address, oneToken);

    // A graph that already passed validation and awaits the committee decision
    const submitTx = await gaDataValidation
      .connect(institution)
      .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);
    const submitReceipt = await submitTx.wait();
    graphId = submitReceipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted")?.args?.[0];
    await gaDataValidation.connect(validator1).markRDFGraphValidated(graphId, true);

    targets = [await gaDataValidation.getAddress()];
    values = [0n];
    calldatas = [gaDataValidation.interface.encodeFunctionData("approveRDFGraph", [graphId])];
    descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
  });

  async function propose(proposer: HardhatEthersSigner): Promise<bigint> {
    await (await committee.connect(proposer).propose(targets, values, calldatas, description)).wait();
    await mine(1); // votingDelay is 0, voting opens on the next block
    return committee.hashProposal(targets, values, calldatas, descriptionHash);
  }

  async function closeVoting(): Promise<void> {
    await mine(VOTING_PERIOD + 1);
  }

  describe("[R2.8] Proposal and voting rights", function () {
    it("A Data_Validator holding permission 30 can put a decision to the committee", async function () {
      expect(await mkmpol21.has_permission(validator1.address, PERM_PROPOSE)).to.equal(true);

      await expect(committee.connect(validator1).propose(targets, values, calldatas, description)).to.emit(
        committee,
        "ProposalCreated",
      );
    });

    it("A Member_Institution cannot put a decision to the committee", async function () {
      expect(await mkmpol21.has_permission(institution.address, PERM_PROPOSE)).to.equal(false);

      await expect(committee.connect(institution).propose(targets, values, calldatas, description)).to.be.revertedWith(
        "User does not have this permission",
      );
    });

    it("An address without any role cannot put a decision to the committee", async function () {
      await expect(committee.connect(outsider).propose(targets, values, calldatas, description)).to.be.revertedWith(
        "User cannot propose",
      );
    });

    it("Only holders of permission 31 can cast a vote", async function () {
      const proposalId = await propose(validator1);

      expect(await mkmpol21.has_permission(ordinary.address, PERM_VOTE)).to.equal(false);
      await expect(committee.connect(ordinary).castVote(proposalId, VOTE_FOR)).to.be.revertedWith(
        "User does not have this permission",
      );
      await expect(committee.connect(outsider).castVote(proposalId, VOTE_FOR)).to.be.revertedWith("User cannot vote");
    });

    it("Tallies for, against and abstain votes separately", async function () {
      const proposalId = await propose(validator1);

      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_AGAINST);
      await committee.connect(validator3).castVote(proposalId, VOTE_ABSTAIN);

      const votes = await committee.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("1"));
      expect(votes.againstVotes).to.equal(ethers.parseEther("1"));
      expect(votes.abstainVotes).to.equal(ethers.parseEther("1"));
      expect(await committee.hasVoted(proposalId, validator1.address)).to.equal(true);
    });

    it("Rejects a proposal that does not reach a majority", async function () {
      const proposalId = await propose(validator1);

      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_AGAINST);
      await committee.connect(validator3).castVote(proposalId, VOTE_AGAINST);
      await closeVoting();

      expect(await committee.state(proposalId)).to.equal(DEFEATED);
      await expect(committee.execute(targets, values, calldatas, descriptionHash)).to.be.revertedWith(
        "Governor: proposal not successful",
      );

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(false);
    });

    it("Refuses execution while voting is still open", async function () {
      const proposalId = await propose(validator1);
      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_FOR);

      await expect(committee.execute(targets, values, calldatas, descriptionHash)).to.be.revertedWith(
        "Governor: proposal not successful",
      );
    });
  });

  describe("[R2.10] Quorum rules", function () {
    it("Derives the quorum from the voting power outstanding at the snapshot block", async function () {
      const proposalId = await propose(validator1);
      const snapshot = await committee.proposalSnapshot(proposalId);

      const pastSupply = await token.getPastTotalSupply(snapshot);
      expect(pastSupply).to.equal(ethers.parseEther("3"));
      expect(await committee.quorum(snapshot)).to.equal((pastSupply * BigInt(QUORUM_PERCENT)) / 100n);
      expect(await committee.quorumNumerator()).to.equal(QUORUM_PERCENT);
    });

    it("Defeats a proposal that has a majority but misses the quorum", async function () {
      const proposalId = await propose(validator1);

      // 1 of 3 votes = 1.0 < 1.02 required
      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await closeVoting();

      const votes = await committee.proposalVotes(proposalId);
      expect(votes.forVotes).to.be.lessThan(await committee.quorum(await committee.proposalSnapshot(proposalId)));
      expect(await committee.state(proposalId)).to.equal(DEFEATED);
    });

    it("Passes a proposal once the quorum is reached", async function () {
      const proposalId = await propose(validator1);

      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_FOR);
      await closeVoting();

      expect(await committee.state(proposalId)).to.equal(SUCCEEDED);
    });

    it("Counts abstentions towards the quorum but not towards the majority", async function () {
      const proposalId = await propose(validator1);

      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_ABSTAIN);
      await closeVoting();

      // for + abstain = 2 >= quorum, and for (1) > against (0)
      expect(await committee.state(proposalId)).to.equal(SUCCEEDED);
    });

    it("Defeats a proposal that reaches the quorum through abstentions alone", async function () {
      const proposalId = await propose(validator1);

      await committee.connect(validator1).castVote(proposalId, VOTE_ABSTAIN);
      await committee.connect(validator2).castVote(proposalId, VOTE_ABSTAIN);
      await closeVoting();

      expect(await committee.state(proposalId)).to.equal(DEFEATED);
    });
  });

  describe("[R2.11] The committee decision drives Validated -> Approved", function () {
    it("Approves the graph on behalf of the committee and attributes the event to it", async function () {
      const proposalId = await propose(validator1);
      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_FOR);
      await closeVoting();

      await expect(committee.execute(targets, values, calldatas, descriptionHash))
        .to.emit(gaDataValidation, "RDFGraphApproved")
        .withArgs(graphId, await committee.getAddress());

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(true);
      expect(await committee.state(proposalId)).to.equal(EXECUTED);
    });

    it("Completes the full scenario: submit -> validate -> committee vote -> approve -> publish", async function () {
      const proposalId = await propose(validator1);
      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_FOR);
      await closeVoting();
      await committee.execute(targets, values, calldatas, descriptionHash);

      expect(await gaDataValidation.isReadyForPublication(graphId)).to.equal(true);

      const ual = "did:dkg:otp:2043/0x123/1";
      await expect(gaDataValidation.connect(validator1).markRDFGraphPublished(graphId, ual))
        .to.emit(gaDataValidation, "RDFGraphPublishedToDKG")
        .withArgs(graphId, ual);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(true);
      expect(status.approved).to.equal(true);
      expect(status.published).to.equal(true);
    });

    it("Cannot execute the same committee decision twice", async function () {
      const proposalId = await propose(validator1);
      await committee.connect(validator1).castVote(proposalId, VOTE_FOR);
      await committee.connect(validator2).castVote(proposalId, VOTE_FOR);
      await closeVoting();
      await committee.execute(targets, values, calldatas, descriptionHash);

      await expect(committee.execute(targets, values, calldatas, descriptionHash)).to.be.revertedWith(
        "Governor: proposal not successful",
      );
    });

    it("A Data_Validator alone cannot perform the approval the committee votes on", async function () {
      expect(await mkmpol21.has_permission(validator1.address, PERM_APPROVE)).to.equal(false);

      await expect(gaDataValidation.connect(validator1).approveRDFGraph(graphId)).to.be.revertedWith(
        "No permission to approve",
      );
    });

    it("GAP: approveRDFGraph only checks permission 6, so a single institution can approve without any vote", async function () {
      // Section IV-A describes approval as a collective committee decision, but the guard in
      // _data_validation.sol is a plain permission check, and Member_Institution holds bit 6.
      expect(await mkmpol21.has_permission(institution.address, PERM_APPROVE)).to.equal(true);

      await expect(gaDataValidation.connect(institution).approveRDFGraph(graphId))
        .to.emit(gaDataValidation, "RDFGraphApproved")
        .withArgs(graphId, institution.address);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(true);
    });

    it("GAP: the submitting institution can also validate and approve its own graph", async function () {
      // Separation of duties (Table III) is not enforced on-chain: Member_Institution holds
      // permissions 8 (submit), 4 (validate) and 6 (approve) at the same time.
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(
          "urn:graph:entities",
          ethers.keccak256(ethers.toUtf8Bytes("self-dealt")),
          1,
          0,
          year,
          modelVersion,
        );
      const receipt = await tx.wait();
      const selfGraphId = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted")?.args?.[0];

      await gaDataValidation.connect(institution).markRDFGraphValidated(selfGraphId, true);
      await gaDataValidation.connect(institution).approveRDFGraph(selfGraphId);

      const status = await gaDataValidation.getGraphStatus(selfGraphId);
      expect(status.validated).to.equal(true);
      expect(status.approved).to.equal(true);

      // Publication is the only step the institution cannot take on its own (role index 0)
      await expect(
        gaDataValidation.connect(institution).markRDFGraphPublished(selfGraphId, "did:dkg:otp:2043/0x123/2"),
      ).to.be.revertedWith("Only Data Validator or Owner can mark published");
    });
  });
});
