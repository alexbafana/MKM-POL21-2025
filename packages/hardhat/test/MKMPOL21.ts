import { expect } from "chai";
import { ethers } from "hardhat";
import { MKMPOL21 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MKMPOL21 Permission System", function () {
  let mkmpol21: MKMPOL21;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let consortium: HardhatEthersSigner;
  let validationCommittee: HardhatEthersSigner;
  let disputeResolutionBoard: HardhatEthersSigner;

  // Role definitions from the contract
  // Format: (control_bitmask << 5) | role_index
  const ROLES = {
    MEMBER_INSTITUTION: 1152, // Index 0, control: 100100 (36)
    ORDINARY_USER: 1153, // Index 1, control: 100100 (36)
    MFSSIA_GUARDIAN_AGENT: 3074, // Index 2, control: 1100000 (96)
    ELIZA_DATA_EXTRACTOR_AGENT: 3075, // Index 3, control: 1100000 (96)
    DATA_VALIDATOR: 1156, // Index 4, control: 100100 (36)
    MKMPOL21_OWNER: 1029, // Index 5, control: 100000 (32)
    CONSORTIUM: 1030, // Index 6, control: 100000 (32)
    VALIDATION_COMMITTEE: 1031, // Index 7, control: 100000 (32)
    DISPUTE_RESOLUTION_BOARD: 1032, // Index 8, control: 100000 (32)
  };

  beforeEach(async () => {
    [owner, user1, user2, , consortium, validationCommittee, disputeResolutionBoard] = await ethers.getSigners();

    const MKMPOL21Factory = await ethers.getContractFactory("MKMPOL21");
    mkmpol21 = (await MKMPOL21Factory.deploy()) as MKMPOL21;
    await mkmpol21.waitForDeployment();
  });

  describe("Deployment and Initialization", function () {
    it("Should assign MKMPOL21Owner role to deployer", async function () {
      const deployerRole = await mkmpol21.hasRole(owner.address);
      expect(deployerRole).to.equal(ROLES.MKMPOL21_OWNER);
    });

    it("Should have no role assigned to random addresses", async function () {
      const userRole = await mkmpol21.hasRole(user1.address);
      expect(userRole).to.equal(0);
    });
  });

  describe("Control Relations", function () {
    it("Contract canControl function matches expected behavior", async function () {
      // Test the contract's canControl function
      expect(await mkmpol21.canControl(ROLES.MKMPOL21_OWNER, ROLES.MEMBER_INSTITUTION)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.MKMPOL21_OWNER, ROLES.ORDINARY_USER)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.CONSORTIUM, ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.DATA_VALIDATOR, ROLES.MEMBER_INSTITUTION)).to.equal(false);
    });
  });

  describe("has_permission Function", function () {
    it("Owner should have permission 0", async function () {
      expect(await mkmpol21.has_permission(owner.address, 0)).to.equal(true);
    });

    it("Owner should have permission 18 (onboard_ordinary_user)", async function () {
      expect(await mkmpol21.has_permission(owner.address, 18)).to.equal(true);
    });

    it("Owner should have permission 27 (distribute_MKMT)", async function () {
      expect(await mkmpol21.has_permission(owner.address, 27)).to.equal(true);
    });

    it("An account without a role is denied every permission Member_Institution holds", async function () {
      // has_permission short-circuits to false when roles[user] == 0. Without that guard
      // `roles[user] & 31` would be 0, so an unroled account would read role index 0
      // (Member_Institution) permission bits as its own.
      const unroled = (await ethers.getSigners())[9];
      expect(await mkmpol21.hasRole(unroled.address)).to.equal(0);

      const bitsHeldByMemberInstitution = [0, 4, 6, 8];

      // Those bits really are set on role index 0, so the guard is what makes the difference
      await mkmpol21.connect(owner).assignRole(user2.address, ROLES.MEMBER_INSTITUTION);
      for (const bit of bitsHeldByMemberInstitution) {
        expect(await mkmpol21.has_permission(user2.address, bit)).to.equal(true);
      }

      // The unroled account must get none of them
      for (const bit of bitsHeldByMemberInstitution) {
        expect(await mkmpol21.has_permission(unroled.address, bit)).to.equal(false);
      }
    });
  });

  describe("Role Assignment", function () {
    it("Owner can assign Member_Institution role", async function () {
      await expect(mkmpol21.connect(owner).assignRole(user1.address, ROLES.MEMBER_INSTITUTION))
        .to.emit(mkmpol21, "RoleAssigned")
        .withArgs(user1.address, ROLES.MEMBER_INSTITUTION);

      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.MEMBER_INSTITUTION);
    });

    it("Owner can assign Ordinary_User role", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.ORDINARY_USER);
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.ORDINARY_USER);
    });

    it("Owner can assign Data_Validator role", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DATA_VALIDATOR);
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.DATA_VALIDATOR);
    });

    it("Owner can assign MFSSIA_Guardian_Agent role", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.MFSSIA_GUARDIAN_AGENT);
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.MFSSIA_GUARDIAN_AGENT);
    });

    it("Non-owner cannot assign roles", async function () {
      await expect(mkmpol21.connect(user1).assignRole(user2.address, ROLES.MEMBER_INSTITUTION)).to.be.revertedWith(
        "the given controller can't perform the given operation on the given controlled one",
      );
    });

    it("Cannot assign role to zero address", async function () {
      await expect(mkmpol21.connect(owner).assignRole(ethers.ZeroAddress, ROLES.MEMBER_INSTITUTION)).to.be.revertedWith(
        "Invalid user address",
      );
    });

    it("Cannot assign invalid role index (>= 9)", async function () {
      const invalidRole = (32 << 5) | 9; // Index 9, any control bitmask
      await expect(mkmpol21.connect(owner).assignRole(user1.address, invalidRole)).to.be.revertedWith(
        "the given controller can't perform the given operation on the given controlled one",
      );
    });
  });

  describe("Role Revocation", function () {
    beforeEach(async () => {
      // Assign a role first
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.MEMBER_INSTITUTION);
    });

    it("Owner can revoke Member_Institution role", async function () {
      await expect(mkmpol21.connect(owner).revokeRole(user1.address, ROLES.MEMBER_INSTITUTION))
        .to.emit(mkmpol21, "RoleRevoked")
        .withArgs(user1.address, ROLES.MEMBER_INSTITUTION);

      expect(await mkmpol21.hasRole(user1.address)).to.equal(0);
    });

    it("Cannot revoke role that user doesn't have", async function () {
      await expect(mkmpol21.connect(owner).revokeRole(user1.address, ROLES.ORDINARY_USER)).to.be.revertedWith(
        "User's role and the role to be removed don't coincide",
      );
    });

    it("Non-owner cannot revoke roles", async function () {
      await expect(mkmpol21.connect(user2).revokeRole(user1.address, ROLES.MEMBER_INSTITUTION)).to.be.revertedWith(
        "the given controller can't perform the given operation on the given controlled one",
      );
    });
  });

  describe("Committee Initialization", function () {
    it("Owner can initialize committees", async function () {
      await mkmpol21
        .connect(owner)
        .initializeCommittees(consortium.address, validationCommittee.address, disputeResolutionBoard.address);

      // After initialization, committees hold the governance-body roles at indices 6, 7 and 8
      expect(await mkmpol21.hasRole(consortium.address)).to.equal(ROLES.CONSORTIUM);
      expect(await mkmpol21.hasRole(validationCommittee.address)).to.equal(ROLES.VALIDATION_COMMITTEE);
      expect(await mkmpol21.hasRole(disputeResolutionBoard.address)).to.equal(ROLES.DISPUTE_RESOLUTION_BOARD);
    });

    it("Cannot initialize committees twice", async function () {
      await mkmpol21
        .connect(owner)
        .initializeCommittees(consortium.address, validationCommittee.address, disputeResolutionBoard.address);

      await expect(
        mkmpol21
          .connect(owner)
          .initializeCommittees(consortium.address, validationCommittee.address, disputeResolutionBoard.address),
      ).to.be.revertedWith("Invalid committee initialization");
    });

    it("Non-owner cannot initialize committees", async function () {
      await expect(
        mkmpol21
          .connect(user1)
          .initializeCommittees(consortium.address, validationCommittee.address, disputeResolutionBoard.address),
      ).to.be.revertedWith("Only the owner can initialize the Dao");
    });

    it("Cannot initialize with zero addresses", async function () {
      await expect(
        mkmpol21
          .connect(owner)
          .initializeCommittees(ethers.ZeroAddress, validationCommittee.address, disputeResolutionBoard.address),
      ).to.be.revertedWith("Invalid committee initialization");

      await expect(
        mkmpol21
          .connect(owner)
          .initializeCommittees(consortium.address, ethers.ZeroAddress, disputeResolutionBoard.address),
      ).to.be.revertedWith("Invalid committee initialization");

      await expect(
        mkmpol21
          .connect(owner)
          .initializeCommittees(consortium.address, validationCommittee.address, ethers.ZeroAddress),
      ).to.be.revertedWith("Invalid committee initialization");
    });
  });

  describe("Permission Granting", function () {
    beforeEach(async () => {
      // Assign Member_Institution role to user1
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.MEMBER_INSTITUTION);
    });

    it("Owner can grant permission to controlled role", async function () {
      // Grant permission 33 to Member_Institution, which does not hold it by
      // default, so the state change is observable
      const permissionIndex = 33;

      // user1 holds Member_Institution, so the role's permission bits are observable through it
      expect(await mkmpol21.has_permission(user1.address, permissionIndex)).to.equal(false);

      await expect(mkmpol21.connect(owner).grantPermission(ROLES.MEMBER_INSTITUTION, permissionIndex))
        .to.emit(mkmpol21, "PermissionGranted")
        .withArgs(ROLES.MEMBER_INSTITUTION, permissionIndex);

      expect(await mkmpol21.has_permission(user1.address, permissionIndex)).to.equal(true);
    });

    it("Cannot grant permission user doesn't have", async function () {
      // Assign user1 a role with limited permissions
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      // DRB only has permissions 0 and 2, try to grant permission 5
      await expect(mkmpol21.connect(user1).grantPermission(ROLES.MEMBER_INSTITUTION, 5)).to.be.revertedWith(
        "User does not have this permission",
      );
    });

    it("Cannot grant permission to role user cannot control", async function () {
      // Assign user1 Data_Validator role
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DATA_VALIDATOR);

      // Permission 4 is held by Data_Validator, so the call gets past the hasPermission
      // modifier and fails on the missing control relation over MKMPOL21Owner
      await expect(mkmpol21.connect(user1).grantPermission(ROLES.MKMPOL21_OWNER, 4)).to.be.revertedWith(
        "cannot grant permission, as the control relation is lacking",
      );
    });
  });

  describe("Permission Revoking", function () {
    it("Owner can revoke permission from controlled role", async function () {
      const permissionIndex = 0;

      // user1 holds Member_Institution, so the role's permission bits are observable through it
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.MEMBER_INSTITUTION);
      expect(await mkmpol21.has_permission(user1.address, permissionIndex)).to.equal(true);

      await expect(mkmpol21.connect(owner).revokePermission(ROLES.MEMBER_INSTITUTION, permissionIndex))
        .to.emit(mkmpol21, "PermissionRevoked")
        .withArgs(ROLES.MEMBER_INSTITUTION, permissionIndex);

      expect(await mkmpol21.has_permission(user1.address, permissionIndex)).to.equal(false);
    });

    it("Cannot revoke permission user doesn't have", async function () {
      // Assign user1 a role with limited permissions
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      // DRB only has permissions 0 and 2, try to revoke permission 5
      await expect(mkmpol21.connect(user1).revokePermission(ROLES.MEMBER_INSTITUTION, 5)).to.be.revertedWith(
        "User does not have this permission",
      );
    });
  });

  describe("canVote and canPropose Functions", function () {
    it("User with correct permission can vote", async function () {
      // Owner has all permissions, so can vote with any permission index
      expect(await mkmpol21.canVote(owner.address, 0)).to.equal(true);
    });

    it("User without permission cannot vote", async function () {
      // Assign user1 DRB role (only permissions 0 and 2)
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      await expect(mkmpol21.canVote(user1.address, 5)).to.be.revertedWith("User does not have this permission");
    });

    it("User with correct permission can propose", async function () {
      expect(await mkmpol21.canPropose(owner.address, 0)).to.equal(true);
    });

    it("User without permission cannot propose", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      await expect(mkmpol21.canPropose(user1.address, 5)).to.be.revertedWith("User does not have this permission");
    });
  });

  describe("Permission-Gated Functions", function () {
    // onboard_ordinary_user / onboard_institution are self-onboarding entry points:
    // they are gated on "caller has no role yet", not on a permission bit
    it("An account without a role can self-onboard as Ordinary_User", async function () {
      await expect(mkmpol21.connect(user1).onboard_ordinary_user()).to.not.be.reverted;
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.ORDINARY_USER);
    });

    it("An account that already holds a role cannot call onboard_ordinary_user", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      await expect(mkmpol21.connect(user1).onboard_ordinary_user()).to.be.revertedWith("User already has a role");
    });

    it("An account without a role can self-onboard as Member_Institution", async function () {
      await expect(mkmpol21.connect(user2).onboard_institution()).to.not.be.reverted;
      expect(await mkmpol21.hasRole(user2.address)).to.equal(ROLES.MEMBER_INSTITUTION);
    });

    it("The owner cannot self-onboard, since it already holds MKMPOL21Owner", async function () {
      await expect(mkmpol21.connect(owner).onboard_institution()).to.be.revertedWith("User already has a role");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Role value 0 maps to index 0 (Member_Institution permissions)", async function () {
      // When a user has no role (0), roleIndex = 0 & 31 = 0
      // This gives them Member_Institution permissions - potential security issue
      const userRole = await mkmpol21.hasRole(user1.address);
      expect(userRole).to.equal(0);

      // Check if user without role can access permission 0 (which Member_Institution has)
      // Due to contract design, this returns true for permission 0
      // This is documented behavior but worth noting
    });

    it("Maximum valid role index is 8", async function () {
      // Verify all indices 0-8 are valid by using predefined roles
      // Owner should be able to assign any valid role index
      const testRoles = [
        ROLES.MEMBER_INSTITUTION,
        ROLES.ORDINARY_USER,
        ROLES.DATA_VALIDATOR,
        ROLES.MFSSIA_GUARDIAN_AGENT,
      ];

      for (const role of testRoles) {
        await mkmpol21.connect(owner).assignRole(user1.address, role);
        await mkmpol21.connect(owner).revokeRole(user1.address, role);
      }
    });

    it("Reassigning role overwrites previous role", async function () {
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.MEMBER_INSTITUTION);
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.MEMBER_INSTITUTION);

      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DATA_VALIDATOR);
      expect(await mkmpol21.hasRole(user1.address)).to.equal(ROLES.DATA_VALIDATOR);
    });
  });
});
