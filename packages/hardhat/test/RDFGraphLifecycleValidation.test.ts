import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { GADataValidation, MKMPOL21 } from "../typechain-types";

/**
 * Two-stage validation and re-processing of RDF graphs.
 *
 * Covers the requirements that were implemented but previously untested, and records the
 * lifecycle transitions that the artifact does not implement at all:
 *   R2.5  versioning of a re-submitted dataset (Table II)
 *   R2.6  Updated -> Validated after an NLP model change (Table II)
 *   R2.7  syntax vs. semantic validation (Section II-A, Table I)
 *   R2.12 on-chain / off-chain hash equality (Section IV-D)
 *   R2.13 / R2.14  Published -> Deprecated and rollback (Table II)
 *   R3.6 / R3.7  reversibility and emergency override (Section V-B, Table XI)
 */
describe("GADataValidation - Validation Semantics and Re-processing (R2.5-R2.7, R2.12-R2.14)", function () {
  let gaDataValidation: GADataValidation;
  let mkmpol21: MKMPOL21;

  let owner: HardhatEthersSigner;
  let institution: HardhatEthersSigner;
  let validator: HardhatEthersSigner;
  let committee: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  const ROLE_MEMBER_INSTITUTION = 1152; // index 0
  const ROLE_DATA_VALIDATOR = 1156; // index 4
  const ROLE_VALIDATION_COMMITTEE = 1031; // index 7
  const ROLE_MFSSIA_GUARDIAN = 3074; // index 2 — holds none of 4, 6, 8

  const graphURI = "urn:graph:articles";
  const graphHash = ethers.keccak256(ethers.toUtf8Bytes("sample RDF content"));
  const graphType = 0; // GraphType.ARTICLES
  const datasetVariant = 0; // DatasetVariant.ERR_ONLINE
  const year = 2024;
  const modelVersion = "EstBERT-1.0";

  const shaclErrors = "sh:minCount violation on ex:hasAuthor (12 nodes); sh:datatype violation on ex:publishedAt";

  let graphId: string;

  async function submitGraph(
    uri: string,
    contentHash: string,
    model: string,
    signer: HardhatEthersSigner = institution,
  ): Promise<string> {
    const tx = await gaDataValidation
      .connect(signer)
      .submitRDFGraph(uri, contentHash, graphType, datasetVariant, year, model);
    const receipt = await tx.wait();
    return receipt?.logs.find((log: any) => log.fragment?.name === "RDFGraphSubmitted")?.args?.[0];
  }

  beforeEach(async function () {
    [owner, institution, validator, committee, unauthorized] = await ethers.getSigners();

    mkmpol21 = await (await ethers.getContractFactory("MKMPOL21")).deploy();
    await mkmpol21.waitForDeployment();

    gaDataValidation = await (
      await ethers.getContractFactory("GADataValidation")
    ).deploy(await mkmpol21.getAddress(), owner.address);
    await gaDataValidation.waitForDeployment();

    await mkmpol21.connect(owner).assignRole(institution.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(validator.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(committee.address, ROLE_VALIDATION_COMMITTEE);
    await mkmpol21.connect(owner).assignRole(unauthorized.address, ROLE_MFSSIA_GUARDIAN);

    graphId = await submitGraph(graphURI, graphHash, modelVersion);
  });

  describe("[R2.7] Syntax and semantic validation are recorded separately", function () {
    it("Marks a graph valid only when both N3 syntax and SHACL semantics pass", async function () {
      await expect(gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, ""))
        .to.emit(gaDataValidation, "RDFGraphValidatedDetailed")
        .withArgs(graphId, true, true, "", validator.address);

      const details = await gaDataValidation.getValidationDetails(graphId);
      expect(details.syntaxValid).to.equal(true);
      expect(details.semanticValid).to.equal(true);
      expect(details.overallValid).to.equal(true);
      expect(details.validationErrors).to.equal("");
    });

    it("Keeps a syntactically valid but semantically invalid graph out of the validated state", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, false, shaclErrors);

      const details = await gaDataValidation.getValidationDetails(graphId);
      expect(details.syntaxValid).to.equal(true);
      expect(details.semanticValid).to.equal(false);
      expect(details.overallValid).to.equal(false);
      expect(details.validationErrors).to.equal(shaclErrors);
    });

    it("Records a syntax failure without claiming semantic validity", async function () {
      const parseError = "Unexpected '.' on line 42";
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, false, false, parseError);

      const details = await gaDataValidation.getValidationDetails(graphId);
      expect(details.syntaxValid).to.equal(false);
      expect(details.semanticValid).to.equal(false);
      expect(details.overallValid).to.equal(false);
      expect(details.validationErrors).to.equal(parseError);
    });

    it("Lets a re-validation clear a previously recorded failure", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, false, shaclErrors);
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, "");

      const details = await gaDataValidation.getValidationDetails(graphId);
      expect(details.overallValid).to.equal(true);
      expect(details.validationErrors).to.equal("");
    });

    it("Requires permission 4 to record a detailed validation result", async function () {
      await expect(
        gaDataValidation.connect(unauthorized).markRDFGraphValidatedWithDetails(graphId, true, true, ""),
      ).to.be.revertedWith("No permission to validate");
    });

    it("Rejects a detailed validation result for a graph that was never submitted", async function () {
      const unknownGraph = ethers.keccak256(ethers.toUtf8Bytes("never submitted"));

      await expect(
        gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(unknownGraph, true, true, ""),
      ).to.be.revertedWith("Graph does not exist");
    });

    it("Overwrites the coarse markRDFGraphValidated result with the detailed one", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidated(graphId, true);
      expect((await gaDataValidation.getGraphStatus(graphId)).validated).to.equal(true);

      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, false, shaclErrors);
      expect((await gaDataValidation.getGraphStatus(graphId)).validated).to.equal(false);
    });

    it("GAP: approval and publication only check syntaxValid, so a SHACL failure reaches the DKG", async function () {
      // Table I distinguishes syntactic from semantic validation, but approveRDFGraph and
      // isReadyForPublication both gate on syntaxValid only.
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, false, shaclErrors);
      expect((await gaDataValidation.getValidationDetails(graphId)).overallValid).to.equal(false);

      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      expect(await gaDataValidation.isReadyForPublication(graphId)).to.equal(true);

      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, "did:dkg:otp:2043/0x123/1");

      const status = await gaDataValidation.getGraphStatus(graphId);
      expect(status.validated).to.equal(false); // never passed semantic validation
      expect(status.published).to.equal(true); // yet it is published
    });
  });

  describe("[R2.5/R2.6] Re-processing a dataset after an NLP model change", function () {
    it("Assigns an incremented version to the re-processed graph and keeps its model version", async function () {
      const rerunHash = ethers.keccak256(ethers.toUtf8Bytes("re-extracted with EstBERT-2.0"));
      const rerunId = await submitGraph(graphURI, rerunHash, "EstBERT-2.0");

      const v1 = await gaDataValidation.getRDFGraphBasicInfo(graphId);
      const v2 = await gaDataValidation.getRDFGraphBasicInfo(rerunId);
      expect(v1.version).to.equal(1);
      expect(v2.version).to.equal(2);

      expect((await gaDataValidation.getRDFGraphMetadata(graphId)).modelVersion).to.equal("EstBERT-1.0");
      expect((await gaDataValidation.getRDFGraphMetadata(rerunId)).modelVersion).to.equal("EstBERT-2.0");
    });

    it("Starts the re-processed version in the Created state instead of inheriting the previous approval", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, "did:dkg:otp:2043/0x123/1");

      const rerunHash = ethers.keccak256(ethers.toUtf8Bytes("re-extracted with EstBERT-2.0"));
      const rerunId = await submitGraph(graphURI, rerunHash, "EstBERT-2.0");

      const status = await gaDataValidation.getGraphStatus(rerunId);
      expect(status.exists).to.equal(true);
      expect(status.validated).to.equal(false);
      expect(status.approved).to.equal(false);
      expect(status.published).to.equal(false);
    });

    it("Forces the re-processed version through validation and approval before publication", async function () {
      const rerunHash = ethers.keccak256(ethers.toUtf8Bytes("re-extracted with EstBERT-2.0"));
      const rerunId = await submitGraph(graphURI, rerunHash, "EstBERT-2.0");

      await expect(
        gaDataValidation.connect(validator).markRDFGraphPublished(rerunId, "did:dkg:otp:2043/0x123/2"),
      ).to.be.revertedWith("Graph must be approved first");

      await expect(gaDataValidation.connect(committee).approveRDFGraph(rerunId)).to.be.revertedWith(
        "Graph must pass syntax validation first",
      );

      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(rerunId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(rerunId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(rerunId, "did:dkg:otp:2043/0x123/2");

      expect((await gaDataValidation.getGraphStatus(rerunId)).published).to.equal(true);
    });

    it("Keeps both versions addressable for lineage reconstruction", async function () {
      const rerunHash = ethers.keccak256(ethers.toUtf8Bytes("re-extracted with EstBERT-2.0"));
      const rerunId = await submitGraph(graphURI, rerunHash, "EstBERT-2.0");

      const lineage = await gaDataValidation.getDatasetGraphs(datasetVariant, year);
      expect(lineage.length).to.equal(2);
      expect(lineage[0]).to.equal(graphId);
      expect(lineage[1]).to.equal(rerunId);

      // Both submissions stay attributable to their submitter and submission time (R3.2)
      const meta = await gaDataValidation.getRDFGraphMetadata(rerunId);
      expect(meta.submitter).to.equal(institution.address);
      expect(meta.submittedAt).to.be.greaterThan(0);
    });

    it("GAP: publishing the new version leaves the superseded one published as well", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, "did:dkg:otp:2043/0x123/1");

      const rerunId = await submitGraph(graphURI, ethers.keccak256(ethers.toUtf8Bytes("v2")), "EstBERT-2.0");
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(rerunId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(rerunId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(rerunId, "did:dkg:otp:2043/0x123/2");

      // Table II expects Published -> Deprecated for the superseded version; nothing marks it
      expect((await gaDataValidation.getGraphStatus(graphId)).published).to.equal(true);
      expect((await gaDataValidation.getGraphStatus(rerunId)).published).to.equal(true);
    });
  });

  describe("[R2.12] On-chain / off-chain correspondence", function () {
    beforeEach(async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
    });

    it("Stores the content hash submitted with the graph", async function () {
      expect((await gaDataValidation.getRDFGraphBasicInfo(graphId)).graphHash).to.equal(graphHash);
    });

    it("GAP: the DKG asset UAL is stored verbatim and never checked against the graph hash", async function () {
      const unrelatedUAL = "not-a-ual";

      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, unrelatedUAL);

      expect((await gaDataValidation.getRDFGraphMetadata(graphId)).dkgAssetUAL).to.equal(unrelatedUAL);
    });

    it("GAP: the same UAL can be attached to two different graphs", async function () {
      const sharedUAL = "did:dkg:otp:2043/0x123/1";
      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, sharedUAL);

      const otherId = await submitGraph(
        "urn:graph:entities",
        ethers.keccak256(ethers.toUtf8Bytes("other")),
        modelVersion,
      );
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(otherId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(otherId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(otherId, sharedUAL);

      expect((await gaDataValidation.getRDFGraphMetadata(otherId)).dkgAssetUAL).to.equal(sharedUAL);
    });
  });

  describe("[R2.13/R2.14/R3.6/R3.7] Lifecycle transitions the artifact does not implement", function () {
    // These assertions document the current ABI surface. They are expected to fail once
    // deprecation, rollback or emergency control is implemented — at which point the
    // requirement coverage table in the evaluation has to be updated as well.
    function functionNames(contract: { interface: { fragments: readonly any[] } }): string[] {
      return contract.interface.fragments.filter((f: any) => f.type === "function").map((f: any) => f.name as string);
    }

    it("Has no Published -> Deprecated transition (R2.13)", async function () {
      const names = functionNames(gaDataValidation);
      expect(names.filter(n => /deprecat/i.test(n))).to.deep.equal([]);
    });

    it("Has no rollback or un-publish transition (R2.14, R3.6)", async function () {
      const names = functionNames(gaDataValidation);
      expect(names.filter(n => /rollback|revert|unpublish|restore/i.test(n))).to.deep.equal([]);
    });

    it("Has no emergency override, suspension or pause entry point (R3.7)", async function () {
      const names = [...functionNames(gaDataValidation), ...functionNames(mkmpol21)];
      expect(names.filter(n => /emergency|suspend|pause|freeze/i.test(n))).to.deep.equal([]);
    });

    it("Cannot undo a publication once it is recorded", async function () {
      await gaDataValidation.connect(validator).markRDFGraphValidatedWithDetails(graphId, true, true, "");
      await gaDataValidation.connect(committee).approveRDFGraph(graphId);
      await gaDataValidation.connect(validator).markRDFGraphPublished(graphId, "did:dkg:otp:2043/0x123/1");

      // The only publication entry point refuses a second call, and no inverse exists
      await expect(
        gaDataValidation.connect(owner).markRDFGraphPublished(graphId, "did:dkg:otp:2043/0x123/1"),
      ).to.be.revertedWith("Already published");

      expect((await gaDataValidation.getGraphStatus(graphId)).published).to.equal(true);
    });
  });
});
