import { expect } from "chai";
import { ethers } from "hardhat";
import { MKMPOL21 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Integration test suite for the MKMPOL21 onboarding flow
 * Tests self-onboarding functions that allow users to assign roles to themselves
 */
describe("MKMPOL21 Onboarding Integration", function () {
  let mkmpol21: MKMPOL21;
  let owner: HardhatEthersSigner;
  let newUser1: HardhatEthersSigner;
  let newUser2: HardhatEthersSigner;
  let newInstitution1: HardhatEthersSigner;
  let newInstitution2: HardhatEthersSigner;

  // Role definitions from the contract
  const ROLES = {
    MEMBER_INSTITUTION: 1152, // Index 0
    ORDINARY_USER: 1153, // Index 1
    MKMPOL21_OWNER: 1029, // Index 5
  };

  // Helper function to extract role index from role value
  function getRoleIndex(roleValue: number): number {
    return roleValue & 31;
  }

  beforeEach(async () => {
    [owner, newUser1, newUser2, newInstitution1, newInstitution2] = await ethers.getSigners();

    const MKMPOL21Factory = await ethers.getContractFactory("MKMPOL21");
    mkmpol21 = (await MKMPOL21Factory.deploy()) as MKMPOL21;
    await mkmpol21.waitForDeployment();
  });

  describe("Self-Onboarding: onboard_ordinary_user()", function () {
    it("New user without role can self-onboard as Ordinary_User", async function () {
      // Verify user has no role initially
      const initialRole = await mkmpol21.hasRole(newUser1.address);
      expect(initialRole).to.equal(0, "New user should have no role");

      // Self-onboard
      await expect(mkmpol21.connect(newUser1).onboard_ordinary_user())
        .to.emit(mkmpol21, "RoleAssigned")
        .withArgs(newUser1.address, ROLES.ORDINARY_USER);

      // Verify role was assigned
      const assignedRole = await mkmpol21.hasRole(newUser1.address);
      expect(assignedRole).to.equal(ROLES.ORDINARY_USER, "User should now have Ordinary_User role");
      expect(getRoleIndex(Number(assignedRole))).to.equal(1, "Role index should be 1");
    });

    it("User who already has a role cannot call onboard_ordinary_user()", async function () {
      // First, self-onboard
      await mkmpol21.connect(newUser1).onboard_ordinary_user();

      // Try to onboard again
      await expect(mkmpol21.connect(newUser1).onboard_ordinary_user()).to.be.revertedWith("User already has a role");
    });

    it("Owner cannot call onboard_ordinary_user() (already has role)", async function () {
      // Owner already has MKMPOL21_OWNER role from deployment
      const ownerRole = await mkmpol21.hasRole(owner.address);
      expect(ownerRole).to.equal(ROLES.MKMPOL21_OWNER, "Owner should have owner role");

      await expect(mkmpol21.connect(owner).onboard_ordinary_user()).to.be.revertedWith("User already has a role");
    });

    it("Multiple different users can each self-onboard", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user();
      await mkmpol21.connect(newUser2).onboard_ordinary_user();

      expect(await mkmpol21.hasRole(newUser1.address)).to.equal(ROLES.ORDINARY_USER);
      expect(await mkmpol21.hasRole(newUser2.address)).to.equal(ROLES.ORDINARY_USER);
    });
  });

  describe("Self-Onboarding: onboard_institution()", function () {
    it("New user without role can self-onboard as Member_Institution", async function () {
      // Verify user has no role initially
      const initialRole = await mkmpol21.hasRole(newInstitution1.address);
      expect(initialRole).to.equal(0, "New institution should have no role");

      // Self-onboard
      await expect(mkmpol21.connect(newInstitution1).onboard_institution())
        .to.emit(mkmpol21, "RoleAssigned")
        .withArgs(newInstitution1.address, ROLES.MEMBER_INSTITUTION);

      // Verify role was assigned
      const assignedRole = await mkmpol21.hasRole(newInstitution1.address);
      expect(assignedRole).to.equal(ROLES.MEMBER_INSTITUTION, "Institution should now have Member_Institution role");
      expect(getRoleIndex(Number(assignedRole))).to.equal(0, "Role index should be 0");
    });

    it("User who already has a role cannot call onboard_institution()", async function () {
      await mkmpol21.connect(newInstitution1).onboard_institution();

      await expect(mkmpol21.connect(newInstitution1).onboard_institution()).to.be.revertedWith(
        "User already has a role",
      );
    });

    it("Multiple different institutions can each self-onboard", async function () {
      await mkmpol21.connect(newInstitution1).onboard_institution();
      await mkmpol21.connect(newInstitution2).onboard_institution();

      expect(await mkmpol21.hasRole(newInstitution1.address)).to.equal(ROLES.MEMBER_INSTITUTION);
      expect(await mkmpol21.hasRole(newInstitution2.address)).to.equal(ROLES.MEMBER_INSTITUTION);
    });
  });

  describe("Self-Onboarding with Attestation: onboard_ordinary_user_with_attestation()", function () {
    const testAttestationUAL = "ual:stub:0x123:1234567890";

    it("New user can self-onboard with attestation", async function () {
      // Verify user has no role initially
      expect(await mkmpol21.hasRole(newUser1.address)).to.equal(0);

      // Self-onboard with attestation
      await expect(mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation(testAttestationUAL))
        .to.emit(mkmpol21, "RoleAssigned")
        .withArgs(newUser1.address, ROLES.ORDINARY_USER)
        .to.emit(mkmpol21, "AttestationVerified");

      // Verify role was assigned
      expect(await mkmpol21.hasRole(newUser1.address)).to.equal(ROLES.ORDINARY_USER);

      // Verify attestation was stored
      const attestation = await mkmpol21.getAttestation(newUser1.address);
      expect(attestation.ual).to.equal(testAttestationUAL);
      expect(attestation.verified).to.equal(true);
    });

    it("Cannot onboard with empty attestation", async function () {
      await expect(mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation("")).to.be.revertedWith(
        "Invalid attestation",
      );
    });

    it("User who already has a role cannot call onboard_ordinary_user_with_attestation()", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation(testAttestationUAL);

      await expect(mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation("ual:new:123")).to.be.revertedWith(
        "User already has a role",
      );
    });

    it("Attestation should be valid after onboarding", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation(testAttestationUAL);

      const isValid = await mkmpol21.isAttestationValid(newUser1.address);
      expect(isValid).to.equal(true);
    });
  });

  describe("Self-Onboarding with Attestation: onboard_institution_with_attestation()", function () {
    const testAttestationUAL = "ual:stub:institution:0xABC:9876543210";

    it("New institution can self-onboard with attestation", async function () {
      // Verify institution has no role initially
      expect(await mkmpol21.hasRole(newInstitution1.address)).to.equal(0);

      // Self-onboard with attestation
      await expect(mkmpol21.connect(newInstitution1).onboard_institution_with_attestation(testAttestationUAL))
        .to.emit(mkmpol21, "RoleAssigned")
        .withArgs(newInstitution1.address, ROLES.MEMBER_INSTITUTION)
        .to.emit(mkmpol21, "AttestationVerified");

      // Verify role was assigned
      expect(await mkmpol21.hasRole(newInstitution1.address)).to.equal(ROLES.MEMBER_INSTITUTION);

      // Verify attestation was stored
      const attestation = await mkmpol21.getAttestation(newInstitution1.address);
      expect(attestation.ual).to.equal(testAttestationUAL);
      expect(attestation.verified).to.equal(true);
    });

    it("Cannot onboard with empty attestation", async function () {
      await expect(mkmpol21.connect(newInstitution1).onboard_institution_with_attestation("")).to.be.revertedWith(
        "Invalid attestation",
      );
    });
  });

  describe("Dashboard Role Check Simulation", function () {
    it("hasRole returns 0 for users without role", async function () {
      const role = await mkmpol21.hasRole(newUser1.address);
      expect(role).to.equal(0);
    });

    it("hasRole returns correct role value after self-onboarding as user", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user();

      const role = await mkmpol21.hasRole(newUser1.address);
      expect(role).to.equal(ROLES.ORDINARY_USER);
      expect(role).to.equal(1153);
    });

    it("hasRole returns correct role value after self-onboarding as institution", async function () {
      await mkmpol21.connect(newInstitution1).onboard_institution();

      const role = await mkmpol21.hasRole(newInstitution1.address);
      expect(role).to.equal(ROLES.MEMBER_INSTITUTION);
      expect(role).to.equal(1152);
    });

    it("Role index extraction works correctly for dashboard display", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user();
      await mkmpol21.connect(newInstitution1).onboard_institution();

      const userRole = Number(await mkmpol21.hasRole(newUser1.address));
      const institutionRole = Number(await mkmpol21.hasRole(newInstitution1.address));

      // Dashboard uses: roleIndex = roleValue & 31
      expect(userRole & 31).to.equal(1); // Ordinary_User index
      expect(institutionRole & 31).to.equal(0); // Member_Institution index
    });
  });

  describe("Full Onboarding Flow Integration", function () {
    it("Complete user onboarding flow simulation", async function () {
      // Step 1: User has no role
      expect(await mkmpol21.hasRole(newUser1.address)).to.equal(0);

      // Step 2: User completes MFSSIA verification (simulated) and gets attestation
      const attestationUAL = `ual:stub:${newUser1.address}:${Date.now()}`;

      // Step 3: User calls onboard_ordinary_user_with_attestation
      const tx = await mkmpol21.connect(newUser1).onboard_ordinary_user_with_attestation(attestationUAL);
      await tx.wait();

      // Step 4: Verify final state
      const finalRole = await mkmpol21.hasRole(newUser1.address);
      expect(finalRole).to.equal(ROLES.ORDINARY_USER);

      // Step 5: Verify attestation is stored
      const attestation = await mkmpol21.getAttestation(newUser1.address);
      expect(attestation.ual).to.equal(attestationUAL);
      expect(attestation.verified).to.equal(true);

      // Step 6: Verify user now has permissions (can access member features)
      // Ordinary_User has permissions defined: 12889096202 (bits 1, 3, 9, 13, 16, 17, 33, 34 are set)
      // Permission 0 is NOT set for Ordinary_User, but permission 1 is
      const hasPermission1 = await mkmpol21.has_permission(newUser1.address, 1);
      expect(hasPermission1).to.equal(true); // Should have permission 1
    });

    it("Complete institution onboarding flow simulation", async function () {
      // Step 1: Institution has no role
      expect(await mkmpol21.hasRole(newInstitution1.address)).to.equal(0);

      // Step 2: Institution completes MFSSIA verification and gets attestation
      const attestationUAL = `ual:stub:institution:${newInstitution1.address}:${Date.now()}`;

      // Step 3: Institution calls onboard_institution_with_attestation
      const tx = await mkmpol21.connect(newInstitution1).onboard_institution_with_attestation(attestationUAL);
      await tx.wait();

      // Step 4: Verify final state
      const finalRole = await mkmpol21.hasRole(newInstitution1.address);
      expect(finalRole).to.equal(ROLES.MEMBER_INSTITUTION);

      // Step 5: Verify attestation is stored
      const attestation = await mkmpol21.getAttestation(newInstitution1.address);
      expect(attestation.ual).to.equal(attestationUAL);
      expect(attestation.verified).to.equal(true);
    });
  });

  describe("Cross-Role Prevention", function () {
    it("User who onboarded as Ordinary_User cannot also onboard as Institution", async function () {
      await mkmpol21.connect(newUser1).onboard_ordinary_user();

      await expect(mkmpol21.connect(newUser1).onboard_institution()).to.be.revertedWith("User already has a role");
    });

    it("Institution who onboarded cannot also onboard as Ordinary_User", async function () {
      await mkmpol21.connect(newInstitution1).onboard_institution();

      await expect(mkmpol21.connect(newInstitution1).onboard_ordinary_user()).to.be.revertedWith(
        "User already has a role",
      );
    });
  });
});
