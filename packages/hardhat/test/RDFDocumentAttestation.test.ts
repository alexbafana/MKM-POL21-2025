import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MKMPOL21 } from "../typechain-types";

/**
 * MFSSIA-attested RDF document submission (MKMPOL21.submitRDFDocument).
 *
 * Covers the requirements that were implemented but previously untested:
 *   R3.3  identity and attestation binding, including attestation expiry (Section V-A)
 *   R3.5  RDF document submission gated by an MFSSIA attestation (8 of 9 challenges)
 *   R3.2  traceability of the submission record (Table X)
 */
describe("MKMPOL21 - Attested RDF Document Submission (R3.2, R3.3, R3.5)", function () {
  let mkmpol21: MKMPOL21;

  let owner: HardhatEthersSigner;
  let institution: HardhatEthersSigner;
  let validator: HardhatEthersSigner;
  let ordinary: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const ROLE_MEMBER_INSTITUTION = 1152; // index 0
  const ROLE_DATA_VALIDATOR = 1156; // index 4
  const ROLE_ORDINARY_USER = 1153; // index 1

  const ONE_YEAR = 365 * 24 * 60 * 60;

  const documentHash = "0x" + "ab".repeat(32); // SHA-256 of the TTL payload, kept off-chain
  const attestationUAL = "did:dkg:otp:2043/0xattestation/1";

  /** Submit a document and return the docId taken from the RDFSubmitted event. */
  async function submitDocument(
    signer: HardhatEthersSigner,
    hash: string,
    ual: string,
    challengesPassed: number,
  ): Promise<string> {
    const tx = await mkmpol21.connect(signer).submitRDFDocument(hash, ual, challengesPassed);
    const receipt = await tx.wait();
    return receipt?.logs.find((log: any) => log.fragment?.name === "RDFSubmitted")?.args?.[0];
  }

  beforeEach(async function () {
    [owner, institution, validator, ordinary, outsider] = await ethers.getSigners();

    mkmpol21 = await (await ethers.getContractFactory("MKMPOL21")).deploy();
    await mkmpol21.waitForDeployment();

    await mkmpol21.connect(owner).assignRole(institution.address, ROLE_MEMBER_INSTITUTION);
    await mkmpol21.connect(owner).assignRole(validator.address, ROLE_DATA_VALIDATOR);
    await mkmpol21.connect(owner).assignRole(ordinary.address, ROLE_ORDINARY_USER);
    // `outsider` keeps role 0
  });

  describe("[R3.5] Challenge threshold", function () {
    it("Accepts a document that passed all nine MFSSIA challenges", async function () {
      const tx = await mkmpol21.connect(institution).submitRDFDocument(documentHash, attestationUAL, 9);
      const receipt = await tx.wait();
      const docId = receipt?.logs.find((log: any) => log.fragment?.name === "RDFSubmitted")?.args?.[0];

      await expect(tx).to.emit(mkmpol21, "RDFSubmitted").withArgs(docId, institution.address, attestationUAL);
      await expect(tx).to.emit(mkmpol21, "RDFValidated").withArgs(docId, true, 9);

      const doc = await mkmpol21.getRDFDocument(docId);
      expect(doc.validated).to.equal(true);
      expect(doc.challengesPassed).to.equal(9);
    });

    it("Accepts a document at the 8 of 9 threshold", async function () {
      const docId = await submitDocument(institution, documentHash, attestationUAL, 8);

      expect((await mkmpol21.getRDFDocument(docId)).validated).to.equal(true);
    });

    it("Records a document below the threshold as not validated instead of rejecting it", async function () {
      const docId = await submitDocument(institution, documentHash, attestationUAL, 7);

      const doc = await mkmpol21.getRDFDocument(docId);
      expect(doc.validated).to.equal(false);
      expect(doc.challengesPassed).to.equal(7);
    });

    it("Records a document that passed no challenge at all", async function () {
      const docId = await submitDocument(institution, documentHash, attestationUAL, 0);

      expect((await mkmpol21.getRDFDocument(docId)).validated).to.equal(false);
    });

    it("Rejects a challenge count above the nine defined challenges", async function () {
      await expect(
        mkmpol21.connect(institution).submitRDFDocument(documentHash, attestationUAL, 10),
      ).to.be.revertedWith("Invalid challenges count");
    });
  });

  describe("[R1.3/R3.5] Who may submit an attested document", function () {
    it("Allows the MKMPOL21 owner to submit", async function () {
      const docId = await submitDocument(owner, documentHash, attestationUAL, 9);

      expect((await mkmpol21.getRDFDocument(docId)).submitter).to.equal(owner.address);
    });

    it("Rejects a Data_Validator", async function () {
      await expect(mkmpol21.connect(validator).submitRDFDocument(documentHash, attestationUAL, 9)).to.be.revertedWith(
        "Only institutions and owners can submit RDF",
      );
    });

    it("Rejects an Ordinary_User", async function () {
      await expect(mkmpol21.connect(ordinary).submitRDFDocument(documentHash, attestationUAL, 9)).to.be.revertedWith(
        "Only institutions and owners can submit RDF",
      );
    });

    it("Rejects an address without any role", async function () {
      await expect(mkmpol21.connect(outsider).submitRDFDocument(documentHash, attestationUAL, 9)).to.be.revertedWith(
        "Only institutions and owners can submit RDF",
      );
    });

    it("Rejects an empty document hash or an empty attestation", async function () {
      await expect(mkmpol21.connect(institution).submitRDFDocument("", attestationUAL, 9)).to.be.revertedWith(
        "Invalid document hash",
      );
      await expect(mkmpol21.connect(institution).submitRDFDocument(documentHash, "", 9)).to.be.revertedWith(
        "Invalid attestation",
      );
    });
  });

  describe("[R3.2] Traceability of the submission record", function () {
    it("Stores submitter, timestamp, content hash and attestation together", async function () {
      const docId = await submitDocument(institution, documentHash, attestationUAL, 9);

      const doc = await mkmpol21.getRDFDocument(docId);
      expect(doc.documentHash).to.equal(documentHash);
      expect(doc.attestationUAL).to.equal(attestationUAL);
      expect(doc.submitter).to.equal(institution.address);
      expect(doc.submittedAt).to.equal(await time.latest());

      // The same record is reachable through the public mapping
      const stored = await mkmpol21.rdfDocuments(docId);
      expect(stored.submitter).to.equal(institution.address);
    });

    it("Gives two submissions of the same content distinct identifiers", async function () {
      const first = await submitDocument(institution, documentHash, attestationUAL, 9);
      const second = await submitDocument(institution, documentHash, attestationUAL, 9);

      expect(first).to.not.equal(second);
    });

    it("Returns an empty record for an unknown document id", async function () {
      const doc = await mkmpol21.getRDFDocument(ethers.keccak256(ethers.toUtf8Bytes("unknown")));

      expect(doc.submitter).to.equal(ethers.ZeroAddress);
      expect(doc.submittedAt).to.equal(0);
    });
  });

  describe("[R3.3] Attestation lifetime", function () {
    it("Binds an attestation to the onboarded institution for one year", async function () {
      const [freshInstitution] = (await ethers.getSigners()).slice(6);

      await expect(mkmpol21.connect(freshInstitution).onboard_institution_with_attestation(attestationUAL)).to.emit(
        mkmpol21,
        "AttestationVerified",
      );

      const attestation = await mkmpol21.getAttestation(freshInstitution.address);
      expect(attestation.ual).to.equal(attestationUAL);
      expect(attestation.verified).to.equal(true);
      expect(attestation.isExpired).to.equal(false);
      expect(attestation.expiresAt).to.equal(BigInt(await time.latest()) + BigInt(ONE_YEAR));
      expect(await mkmpol21.isAttestationValid(freshInstitution.address)).to.equal(true);
    });

    it("Treats the attestation as invalid once the validity period elapses", async function () {
      const [freshInstitution] = (await ethers.getSigners()).slice(6);
      await mkmpol21.connect(freshInstitution).onboard_institution_with_attestation(attestationUAL);

      await time.increase(ONE_YEAR + 1);

      expect(await mkmpol21.isAttestationValid(freshInstitution.address)).to.equal(false);
      expect((await mkmpol21.getAttestation(freshInstitution.address)).isExpired).to.equal(true);
    });

    it("Reports no attestation for an account that never onboarded through MFSSIA", async function () {
      expect(await mkmpol21.isAttestationValid(institution.address)).to.equal(false);
    });

    it("Rejects onboarding with an empty attestation", async function () {
      const [freshInstitution] = (await ethers.getSigners()).slice(6);

      await expect(mkmpol21.connect(freshInstitution).onboard_institution_with_attestation("")).to.be.revertedWith(
        "Invalid attestation",
      );
    });

    it("GAP: submitRDFDocument never checks the submitter's attestation", async function () {
      // `institution` received its role through assignRole and holds no attestation at all,
      // and the attestation string passed to submitRDFDocument is stored without verification.
      expect(await mkmpol21.isAttestationValid(institution.address)).to.equal(false);

      const docId = await submitDocument(institution, documentHash, "not-a-ual", 9);

      expect((await mkmpol21.getRDFDocument(docId)).validated).to.equal(true);
    });

    it("GAP: an expired attestation does not stop further submissions", async function () {
      const [freshInstitution] = (await ethers.getSigners()).slice(6);
      await mkmpol21.connect(freshInstitution).onboard_institution_with_attestation(attestationUAL);

      await time.increase(ONE_YEAR + 1);
      expect(await mkmpol21.isAttestationValid(freshInstitution.address)).to.equal(false);

      const docId = await submitDocument(freshInstitution, documentHash, attestationUAL, 9);
      expect((await mkmpol21.getRDFDocument(docId)).validated).to.equal(true);
    });
  });
});
