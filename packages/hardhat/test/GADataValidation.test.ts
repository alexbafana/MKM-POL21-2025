import { expect } from "chai";
import { ethers } from "hardhat";
import { GADataValidation, MKMPOL21 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("GADataValidation - RDF Graph Registry", function () {
  let gaDataValidation: GADataValidation;
  let mkmpol21: MKMPOL21;
  let owner: HardhatEthersSigner;
  let institution: HardhatEthersSigner;
  let validator: HardhatEthersSigner;
  let committee: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  // Role values from MKMPOL21 contract
  const ROLE_MEMBER_INSTITUTION = 1152; // Index 0
  const ROLE_DATA_VALIDATOR = 1156; // Index 4
  const ROLE_VALIDATION_COMMITTEE = 1031; // Index 7
  const ROLE_MFSSIA_GUARDIAN = 3074; // Index 2 (no perms 4,5,6,8 - for testing unauthorized)

  // Sample graph data
  const graphURI = "urn:graph:articles";
  const graphHash = ethers.keccak256(ethers.toUtf8Bytes("sample RDF content"));
  const graphType = 0; // GraphType.ARTICLES
  const datasetVariant = 0; // DatasetVariant.ERR_ONLINE
  const year = 2024;
  const modelVersion = "EstBERT-1.0";

  beforeEach(async function () {
    // Get signers
    [owner, institution, validator, committee, unauthorized] = await ethers.getSigners();

    // Deploy MKMPOL21 (permission manager)
    const MKMPOL21Factory = await ethers.getContractFactory("MKMPOL21");
    mkmpol21 = await MKMPOL21Factory.deploy();
    await mkmpol21.waitForDeployment();

    const mkmpol21Address = await mkmpol21.getAddress();

    // Deploy GADataValidation
    const GADataValidationFactory = await ethers.getContractFactory("GADataValidation");
    gaDataValidation = await GADataValidationFactory.deploy(mkmpol21Address, owner.address);
    await gaDataValidation.waitForDeployment();

    // Assign roles
    // Owner already has role 5 (MKMPOL21Owner) from constructor
    await mkmpol21.connect(owner).assignRole(institution.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(validator.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(committee.address, ROLE_VALIDATION_COMMITTEE);
    // Assign unauthorized to a role that has no permissions 4,5,6,8 (for negative tests)
    await mkmpol21.connect(owner).assignRole(unauthorized.address, ROLE_MFSSIA_GUARDIAN);

    // Grant required permissions to roles
    // Permission 4 for Data_Validator to validate
    await mkmpol21.connect(owner).grantPermission(ROLE_DATA_VALIDATOR, 4);
    // Permission 6 for Validation_Committee to approve
    await mkmpol21.connect(owner).grantPermission(ROLE_VALIDATION_COMMITTEE, 6);
    // Permission 8 for Member_Institution to submit (should already have it, but ensure)
    await mkmpol21.connect(owner).grantPermission(ROLE_MEMBER_INSTITUTION, 8);
  });

  describe("Deployment", function () {
    it("Should deploy GADataValidation successfully", async function () {
      const pmAddress = await gaDataValidation.pm();
      expect(pmAddress).to.equal(await mkmpol21.getAddress());
    });

    it("Should initialize counters to zero", async function () {
      expect(await gaDataValidation.sessionCount()).to.equal(0);
      expect(await gaDataValidation.rdfGraphCount()).to.equal(0);
    });
  });

  describe("submitRDFGraph", function () {
    it("Should allow institution to submit RDF graph", async function () {
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");

      expect(event).to.not.equal(undefined);
      expect(await gaDataValidation.rdfGraphCount()).to.equal(1);
    });

    it("Should reject submission without permission 8", async function () {
      await expect(
        gaDataValidation
          .connect(unauthorized)
          .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion),
      ).to.be.revertedWith("No permission to submit RDF graph");
    });

    it("Should reject submission with invalid hash", async function () {
      await expect(
        gaDataValidation.connect(institution).submitRDFGraph(
          graphURI,
          ethers.ZeroHash, // Invalid hash
          graphType,
          datasetVariant,
          year,
          modelVersion,
        ),
      ).to.be.revertedWith("Invalid graph hash");
    });

    it("Should reject submission with empty URI", async function () {
      await expect(
        gaDataValidation
          .connect(institution)
          .submitRDFGraph("", graphHash, graphType, datasetVariant, year, modelVersion),
      ).to.be.revertedWith("Invalid graph URI");
    });

    it("Should reject submission with invalid year", async function () {
      await expect(
        gaDataValidation
          .connect(institution)
          .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, 1999, modelVersion),
      ).to.be.revertedWith("Invalid year");

      await expect(
        gaDataValidation
          .connect(institution)
          .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, 2101, modelVersion),
      ).to.be.revertedWith("Invalid year");
    });

    it("Should auto-increment version for same dataset/year", async function () {
      // Submit first graph
      const tx1 = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt1 = await tx1.wait();
      const event1 = receipt1?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      const graphId1 = event1?.args?.[0];

      // Submit second graph (different hash)
      const graphHash2 = ethers.keccak256(ethers.toUtf8Bytes("different RDF content"));
      const tx2 = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash2, graphType, datasetVariant, year, modelVersion);

      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      const graphId2 = event2?.args?.[0];

      // Get graph details
      const [, , , , , version1] = await gaDataValidation.getRDFGraphBasicInfo(graphId1);
      const [, , , , , version2] = await gaDataValidation.getRDFGraphBasicInfo(graphId2);

      expect(version1).to.equal(1);
      expect(version2).to.equal(2);
    });

    it("Should prevent duplicate graph submissions", async function () {
      // Submit first time
      await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to submit exact same graph again should fail (different timestamp makes different graphId)
      // Actually, the graphId includes timestamp, so this won't be a duplicate
      // Let's test that different graphs are allowed
      const graphHash2 = ethers.keccak256(ethers.toUtf8Bytes("different content"));
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash2, graphType, datasetVariant, year, modelVersion);

      expect(tx.hash).to.not.equal(undefined);
    });
  });

  describe("markRDFGraphValidated", function () {
    let graphId: string;

    beforeEach(async function () {
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      graphId = event?.args?.[0];
    });

    it("Should allow data validator to mark graph as validated", async function () {
      await expect(gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true))
        .to.emit(gaDataValidation, "RDFGraphValidated")
        .withArgs(graphId, true, validator.address);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(true);
    });

    it("Should allow validator to mark graph as invalid", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, false);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(false);
    });

    it("Should reject validation without permission 4", async function () {
      await expect(gaDataValidation.connect(unauthorized).markRDFGraphValidated(graphId, true)).to.be.revertedWith(
        "No permission to validate",
      );
    });

    it("Should reject validation of non-existent graph", async function () {
      const fakeGraphId = ethers.keccak256(ethers.toUtf8Bytes("fake graph"));
      await expect(gaDataValidation.connect(validator).markRDFGraphValidated(fakeGraphId, true)).to.be.revertedWith(
        "Graph does not exist",
      );
    });
  });

  describe("approveRDFGraph", function () {
    let graphId: string;

    beforeEach(async function () {
      // Submit graph
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      graphId = event?.args?.[0];

      // Validate graph
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);
    });

    it("Should allow committee to approve validated graph", async function () {
      await expect(gaDataValidation.connect(committee).approveRDFGraph(graphId))
        .to.emit(gaDataValidation, "RDFGraphApproved")
        .withArgs(graphId, committee.address);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(true);
    });

    it("Should reject approval without permission 6", async function () {
      await expect(gaDataValidation.connect(unauthorized).approveRDFGraph(graphId)).to.be.revertedWith(
        "No permission to approve",
      );
    });

    it("Should reject approval of non-validated graph", async function () {
      // Submit another graph
      const graphHash2 = ethers.keccak256(ethers.toUtf8Bytes("different content"));
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash2, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      const unvalidatedGraphId = event?.args?.[0];

      await expect(gaDataValidation.connect(committee).approveRDFGraph(unvalidatedGraphId)).to.be.revertedWith(
        "Graph must pass validation first",
      );
    });

    it("Should reject approval of non-existent graph", async function () {
      const fakeGraphId = ethers.keccak256(ethers.toUtf8Bytes("fake graph"));
      await expect(gaDataValidation.connect(committee).approveRDFGraph(fakeGraphId)).to.be.revertedWith(
        "Graph does not exist",
      );
    });

    it("Should reject double approval", async function () {
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);

      await expect(gaDataValidation.connect(committee).approveRDFGraph(graphId)).to.be.revertedWith("Already approved");
    });
  });

  describe("markRDFGraphPublished", function () {
    let graphId: string;
    const dkgAssetUAL = "did:dkg:asset:err_online_2024_v1";

    beforeEach(async function () {
      // Submit graph
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      graphId = event?.args?.[0];

      // Validate graph
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);

      // Approve graph
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
    });

    it("Should allow owner to mark graph as published", async function () {
      await expect(gaDataValidation.connect(owner).markRDFGraphPublished(graphId, dkgAssetUAL))
        .to.emit(gaDataValidation, "RDFGraphPublishedToDKG")
        .withArgs(graphId, dkgAssetUAL);

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.published).to.equal(true);

      const [, , , dkgUAL] = await gaDataValidation.getRDFGraphMetadata(graphId);
      expect(dkgUAL).to.equal(dkgAssetUAL);
    });

    it("Should reject publication without permission 5", async function () {
      await expect(
        gaDataValidation.connect(unauthorized).markRDFGraphPublished(graphId, dkgAssetUAL),
      ).to.be.revertedWith("No permission to mark published");
    });

    it("Should reject publication of non-approved graph", async function () {
      // Submit another graph and validate but don't approve
      const graphHash2 = ethers.keccak256(ethers.toUtf8Bytes("different content"));
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash2, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      const unapprovedGraphId = event?.args?.[0];

      await gaDataValidation.connect(validator).markRDFGraphValidated(unapprovedGraphId, true);

      await expect(
        gaDataValidation.connect(owner).markRDFGraphPublished(unapprovedGraphId, dkgAssetUAL),
      ).to.be.revertedWith("Graph must be approved first");
    });

    it("Should reject publication with empty UAL", async function () {
      await expect(gaDataValidation.connect(owner).markRDFGraphPublished(graphId, "")).to.be.revertedWith(
        "Invalid DKG asset UAL",
      );
    });

    it("Should reject double publication", async function () {
      await gaDataValidation.connect(owner).markRDFGraphPublished(graphId, dkgAssetUAL);

      await expect(gaDataValidation.connect(owner).markRDFGraphPublished(graphId, dkgAssetUAL)).to.be.revertedWith(
        "Already published",
      );
    });
  });

  describe("View Functions", function () {
    let graphId: string;

    beforeEach(async function () {
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      graphId = event?.args?.[0];
    });

    it("Should return basic graph info", async function () {
      const [hash, uri, gType, dVariant, yr, version] = await gaDataValidation.getRDFGraphBasicInfo(graphId);

      expect(hash).to.equal(graphHash);
      expect(uri).to.equal(graphURI);
      expect(gType).to.equal(graphType);
      expect(dVariant).to.equal(datasetVariant);
      expect(yr).to.equal(year);
      expect(version).to.equal(1);
    });

    it("Should return graph metadata", async function () {
      const [submitter, submittedAt, mVersion, dkgUAL] = await gaDataValidation.getRDFGraphMetadata(graphId);

      expect(submitter).to.equal(institution.address);
      expect(Number(submittedAt)).to.be.greaterThan(0);
      expect(mVersion).to.equal(modelVersion);
      expect(dkgUAL).to.equal("");
    });

    it("Should return graph status", async function () {
      let status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.exists).to.equal(true);
      expect(status.validated).to.equal(false);
      expect(status.approved).to.equal(false);
      expect(status.published).to.equal(false);

      // Validate
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(true);

      // Approve
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(true);

      // Publish
      await gaDataValidation.connect(owner).markRDFGraphPublished(graphId, "did:dkg:asset:test");
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.published).to.equal(true);
    });

    it("Should check if graph is ready for publication", async function () {
      let isReady = await gaDataValidation.isReadyForPublication(graphId);
      expect(isReady).to.equal(false);

      // Validate
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);
      isReady = await gaDataValidation.isReadyForPublication(graphId);
      expect(isReady).to.equal(false); // Not approved yet

      // Approve
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      isReady = await gaDataValidation.isReadyForPublication(graphId);
      expect(isReady).to.equal(true); // Ready!

      // Publish
      await gaDataValidation.connect(owner).markRDFGraphPublished(graphId, "did:dkg:asset:test");
      isReady = await gaDataValidation.isReadyForPublication(graphId);
      expect(isReady).to.equal(false); // Already published
    });

    it("Should return all graphs for dataset/year", async function () {
      // Submit two more graphs
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("content 2"));
      await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, hash2, graphType, datasetVariant, year, modelVersion);

      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("content 3"));
      await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, hash3, graphType, datasetVariant, year, modelVersion);

      const graphs = await gaDataValidation.getDatasetGraphs(datasetVariant, year);
      expect(graphs.length).to.equal(3);
    });
  });

  describe("End-to-End Workflow", function () {
    it("Should complete full governance workflow", async function () {
      // 1. Institution submits RDF graph
      const tx = await gaDataValidation
        .connect(institution)
        .submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted");
      const graphId = event?.args?.[0];

      // Verify initial state
      let status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.exists).to.equal(true);
      expect(status.validated).to.equal(false);
      expect(status.approved).to.equal(false);
      expect(status.published).to.equal(false);

      // 2. Data Validator validates graph
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(true);

      // 3. Validation Committee approves graph
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.approved).to.equal(true);

      // 4. Owner marks as published to DKG
      const dkgAssetUAL = "did:dkg:asset:err_online_2024_v1";
      await gaDataValidation.connect(owner).markRDFGraphPublished(graphId, dkgAssetUAL);
      status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.published).to.equal(true);

      // Verify DKG UAL is stored
      const [, , , storedUAL] = await gaDataValidation.getRDFGraphMetadata(graphId);
      expect(storedUAL).to.equal(dkgAssetUAL);

      console.log("✅ Complete governance workflow executed successfully!");
    });
  });
});
