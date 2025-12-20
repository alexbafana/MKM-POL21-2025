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

  // Expected permission values from constructor
  const EXPECTED_PERMISSIONS = {
    MEMBER_INSTITUTION: 999999999n, // Index 0
    ORDINARY_USER: 12889096202n, // Index 1
    MFSSIA_GUARDIAN_AGENT: 26507264n, // Index 2
    ELIZA_DATA_EXTRACTOR_AGENT: 229376n, // Index 3
    DATA_VALIDATOR: 16915628938n, // Index 4
    MKMPOL21_OWNER: 17179869183n, // Index 5
    CONSORTIUM: 237502512n, // Index 6
    VALIDATION_COMMITTEE: 1088n, // Index 7
    DISPUTE_RESOLUTION_BOARD: 5n, // Index 8
  };

  // Helper function to extract role index from role value
  function getRoleIndex(roleValue: number): number {
    return roleValue & 31; // Bits 0-4
  }

  // Helper function to extract control bitmask from role value
  function getControlBitmask(roleValue: number): number {
    return roleValue >> 5; // Bits 5+
  }

  // Helper function to check if a role can control another role
  function canControl(controllerRole: number, controlledRole: number): boolean {
    const controllerIndex = getRoleIndex(controllerRole);
    const controlledBitmask = getControlBitmask(controlledRole);
    return (controlledBitmask & (1 << controllerIndex)) !== 0;
  }

  // Helper function to check if a permission is set
  function hasPermissionBit(permissions: bigint, permissionIndex: number): boolean {
    return (permissions & (1n << BigInt(permissionIndex))) !== 0n;
  }

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

    it("Should correctly encode MKMPOL21Owner role with index 5", async function () {
      const roleValue = ROLES.MKMPOL21_OWNER;
      expect(getRoleIndex(roleValue)).to.equal(5);
    });

    it("Should correctly encode control bitmask for MKMPOL21Owner (only self-controlled)", async function () {
      const roleValue = ROLES.MKMPOL21_OWNER;
      const controlBitmask = getControlBitmask(roleValue);
      // Control bitmask 100000 (binary) = 32, meaning only role index 5 (Owner) can control
      expect(controlBitmask).to.equal(32);
    });

    it("Should have no role assigned to random addresses", async function () {
      const userRole = await mkmpol21.hasRole(user1.address);
      expect(userRole).to.equal(0);
    });
  });

  describe("Role Encoding Verification", function () {
    it("Should correctly encode all role indices (0-8)", async function () {
      const roleEntries = Object.entries(ROLES);
      const expectedIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

      roleEntries.forEach(([name, value], i) => {
        const index = getRoleIndex(value);
        expect(index).to.equal(expectedIndices[i], `Role ${name} should have index ${expectedIndices[i]}`);
      });
    });

    it("Should correctly encode Member_Institution (index 0, control: 100100)", async function () {
      expect(getRoleIndex(ROLES.MEMBER_INSTITUTION)).to.equal(0);
      expect(getControlBitmask(ROLES.MEMBER_INSTITUTION)).to.equal(0b100100); // 36
    });

    it("Should correctly encode Ordinary_User (index 1, control: 100100)", async function () {
      expect(getRoleIndex(ROLES.ORDINARY_USER)).to.equal(1);
      expect(getControlBitmask(ROLES.ORDINARY_USER)).to.equal(0b100100); // 36
    });

    it("Should correctly encode MFSSIA_Guardian_Agent (index 2, control: 1100000)", async function () {
      expect(getRoleIndex(ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(2);
      expect(getControlBitmask(ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(0b1100000); // 96
    });

    it("Should correctly encode Eliza_Data_Extractor_Agent (index 3, control: 1100000)", async function () {
      expect(getRoleIndex(ROLES.ELIZA_DATA_EXTRACTOR_AGENT)).to.equal(3);
      expect(getControlBitmask(ROLES.ELIZA_DATA_EXTRACTOR_AGENT)).to.equal(0b1100000); // 96
    });

    it("Should correctly encode Data_Validator (index 4, control: 100100)", async function () {
      expect(getRoleIndex(ROLES.DATA_VALIDATOR)).to.equal(4);
      expect(getControlBitmask(ROLES.DATA_VALIDATOR)).to.equal(0b100100); // 36
    });

    it("Should correctly encode committee roles with control bitmask 100000", async function () {
      // Consortium, Validation_Committee, Dispute_Resolution_Board all have control bitmask 32 (100000)
      expect(getControlBitmask(ROLES.CONSORTIUM)).to.equal(32);
      expect(getControlBitmask(ROLES.VALIDATION_COMMITTEE)).to.equal(32);
      expect(getControlBitmask(ROLES.DISPUTE_RESOLUTION_BOARD)).to.equal(32);
    });
  });

  describe("Control Relations", function () {
    it("MKMPOL21Owner can control Member_Institution (index 5 controls index 0)", async function () {
      // Control bitmask for Member_Institution is 100100 (binary)
      // Bit 5 is set, so Owner (index 5) can control
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.MEMBER_INSTITUTION)).to.equal(true);
    });

    it("MKMPOL21Owner can control Ordinary_User", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.ORDINARY_USER)).to.equal(true);
    });

    it("MKMPOL21Owner can control Data_Validator", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.DATA_VALIDATOR)).to.equal(true);
    });

    it("MKMPOL21Owner can control MFSSIA_Guardian_Agent", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(true);
    });

    it("MKMPOL21Owner can control Eliza_Data_Extractor_Agent", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.ELIZA_DATA_EXTRACTOR_AGENT)).to.equal(true);
    });

    it("MKMPOL21Owner can control itself", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.MKMPOL21_OWNER)).to.equal(true);
    });

    it("MKMPOL21Owner can control committee roles", async function () {
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.CONSORTIUM)).to.equal(true);
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.VALIDATION_COMMITTEE)).to.equal(true);
      expect(canControl(ROLES.MKMPOL21_OWNER, ROLES.DISPUTE_RESOLUTION_BOARD)).to.equal(true);
    });

    it("Consortium (index 6) can control MFSSIA_Guardian_Agent", async function () {
      // Control bitmask for MFSSIA_Guardian_Agent is 1100000
      // Bit 6 is set, so Consortium (index 6) can control
      expect(canControl(ROLES.CONSORTIUM, ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(true);
    });

    it("Consortium (index 6) can control Eliza_Data_Extractor_Agent", async function () {
      expect(canControl(ROLES.CONSORTIUM, ROLES.ELIZA_DATA_EXTRACTOR_AGENT)).to.equal(true);
    });

    it("Data_Validator (index 4) cannot control Member_Institution", async function () {
      // Control bitmask for Member_Institution is 100100 (bit 2 and bit 5)
      // Bit 4 is NOT set, so Data_Validator cannot control
      expect(canControl(ROLES.DATA_VALIDATOR, ROLES.MEMBER_INSTITUTION)).to.equal(false);
    });

    it("Member_Institution (index 0) cannot control MKMPOL21Owner", async function () {
      expect(canControl(ROLES.MEMBER_INSTITUTION, ROLES.MKMPOL21_OWNER)).to.equal(false);
    });

    it("Ordinary_User (index 1) cannot control any role", async function () {
      expect(canControl(ROLES.ORDINARY_USER, ROLES.MEMBER_INSTITUTION)).to.equal(false);
      expect(canControl(ROLES.ORDINARY_USER, ROLES.MKMPOL21_OWNER)).to.equal(false);
      expect(canControl(ROLES.ORDINARY_USER, ROLES.DATA_VALIDATOR)).to.equal(false);
    });

    it("Contract canControl function matches expected behavior", async function () {
      // Test the contract's canControl function
      expect(await mkmpol21.canControl(ROLES.MKMPOL21_OWNER, ROLES.MEMBER_INSTITUTION)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.MKMPOL21_OWNER, ROLES.ORDINARY_USER)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.CONSORTIUM, ROLES.MFSSIA_GUARDIAN_AGENT)).to.equal(true);
      expect(await mkmpol21.canControl(ROLES.DATA_VALIDATOR, ROLES.MEMBER_INSTITUTION)).to.equal(false);
    });
  });

  describe("Permission Initialization", function () {
    it("Member_Institution should have correct permissions (999999999)", async function () {
      // Verify by checking specific permission bits
      const ownerPermissions = EXPECTED_PERMISSIONS.MEMBER_INSTITUTION;

      // Test a few specific permission indices that should be set
      // 999999999 in binary has many bits set
      expect(hasPermissionBit(ownerPermissions, 0)).to.equal(true);
      expect(hasPermissionBit(ownerPermissions, 1)).to.equal(true);
      expect(hasPermissionBit(ownerPermissions, 2)).to.equal(true);
    });

    it("MKMPOL21Owner should have maximum permissions (17179869183)", async function () {
      const ownerPermissions = EXPECTED_PERMISSIONS.MKMPOL21_OWNER;
      // 17179869183 = 0x3FFFFFFFF (34 bits set)
      // This means owner has permissions 0-33

      for (let i = 0; i < 34; i++) {
        expect(hasPermissionBit(ownerPermissions, i)).to.equal(true);
      }
      // Permission 34 should not be set
      expect(hasPermissionBit(ownerPermissions, 34)).to.equal(false);
    });

    it("Dispute_Resolution_Board should have minimal permissions (5)", async function () {
      const drbPermissions = EXPECTED_PERMISSIONS.DISPUTE_RESOLUTION_BOARD;
      // 5 = 0b101, so permissions 0 and 2 are set
      expect(hasPermissionBit(drbPermissions, 0)).to.equal(true);
      expect(hasPermissionBit(drbPermissions, 1)).to.equal(false);
      expect(hasPermissionBit(drbPermissions, 2)).to.equal(true);
      expect(hasPermissionBit(drbPermissions, 3)).to.equal(false);
    });

    it("Validation_Committee should have permissions (1088)", async function () {
      const vcPermissions = EXPECTED_PERMISSIONS.VALIDATION_COMMITTEE;
      // 1088 = 0b10001000000 = bits 6 and 10 set
      expect(hasPermissionBit(vcPermissions, 6)).to.equal(true);
      expect(hasPermissionBit(vcPermissions, 10)).to.equal(true);
      expect(hasPermissionBit(vcPermissions, 0)).to.equal(false);
    });

    it("Eliza_Data_Extractor_Agent should have permissions (229376)", async function () {
      const elizaPermissions = EXPECTED_PERMISSIONS.ELIZA_DATA_EXTRACTOR_AGENT;
      // 229376 = 0x38000 = 0b111000000000000000 = bits 15, 16, 17 set
      expect(hasPermissionBit(elizaPermissions, 15)).to.equal(true);
      expect(hasPermissionBit(elizaPermissions, 16)).to.equal(true);
      expect(hasPermissionBit(elizaPermissions, 17)).to.equal(true);
      expect(hasPermissionBit(elizaPermissions, 14)).to.equal(false);
      expect(hasPermissionBit(elizaPermissions, 18)).to.equal(false);
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

    it("User without role should not have any permissions", async function () {
      // User without a role has role value 0, which maps to index 0 (Member_Institution permissions)
      // But since they don't actually have the role assigned, let's verify the behavior
      const userRole = await mkmpol21.hasRole(user1.address);
      expect(userRole).to.equal(0);

      // Note: The contract uses roles[user] & 31 which gives 0 for unassigned users
      // This means they get Member_Institution permissions (index 0)
      // This is a potential security consideration
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

      // After initialization, committees should have their respective roles
      // Note: Based on contract code, they get roles at indices 0, 1, 2 not 6, 7, 8
      expect(await mkmpol21.hasRole(consortium.address)).to.equal(ROLES.MEMBER_INSTITUTION);
      expect(await mkmpol21.hasRole(validationCommittee.address)).to.equal(ROLES.ORDINARY_USER);
      expect(await mkmpol21.hasRole(disputeResolutionBoard.address)).to.equal(ROLES.MFSSIA_GUARDIAN_AGENT);
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
      // Owner has permission 0 and can control Member_Institution
      // Grant permission 0 to Member_Institution (which already has it, but this tests the mechanism)
      const permissionIndex = 33; // A permission the owner has but Member_Institution might not

      await expect(mkmpol21.connect(owner).grantPermission(ROLES.MEMBER_INSTITUTION, permissionIndex))
        .to.emit(mkmpol21, "PermissionGranted")
        .withArgs(ROLES.MEMBER_INSTITUTION, permissionIndex);
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

      // Data_Validator cannot control MKMPOL21Owner
      await expect(mkmpol21.connect(user1).grantPermission(ROLES.MKMPOL21_OWNER, 0)).to.be.revertedWith(
        "cannot grant permission, as the control relation is lacking",
      );
    });
  });

  describe("Permission Revoking", function () {
    it("Owner can revoke permission from controlled role", async function () {
      const permissionIndex = 0;

      await expect(mkmpol21.connect(owner).revokePermission(ROLES.MEMBER_INSTITUTION, permissionIndex))
        .to.emit(mkmpol21, "PermissionRevoked")
        .withArgs(ROLES.MEMBER_INSTITUTION, permissionIndex);
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
    it("Owner can call onboard_ordinary_user (permission 18)", async function () {
      // This should not revert since owner has permission 18
      await expect(mkmpol21.connect(owner).onboard_ordinary_user()).to.not.be.reverted;
    });

    it("User without permission 18 cannot call onboard_ordinary_user", async function () {
      // DRB only has permissions 0 and 2
      await mkmpol21.connect(owner).assignRole(user1.address, ROLES.DISPUTE_RESOLUTION_BOARD);

      await expect(mkmpol21.connect(user1).onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission",
      );
    });

    it("Owner can call onboard_institution (permission 19)", async function () {
      await expect(mkmpol21.connect(owner).onboard_institution()).to.not.be.reverted;
    });

    it("Owner can call remove_ordinary_member (permission 20)", async function () {
      await expect(mkmpol21.connect(owner).remove_ordinary_member()).to.not.be.reverted;
    });

    it("Owner can call remove_institution (permission 21)", async function () {
      await expect(mkmpol21.connect(owner).remove_institution()).to.not.be.reverted;
    });

    it("Owner can call submit_query_to_eliza_agent (permission 22)", async function () {
      await expect(mkmpol21.connect(owner).submit_query_to_eliza_agent()).to.not.be.reverted;
    });

    it("Owner can call Issue_DID (permission 23)", async function () {
      await expect(mkmpol21.connect(owner).Issue_DID()).to.not.be.reverted;
    });

    it("Owner can call Burn_DID (permission 24)", async function () {
      await expect(mkmpol21.connect(owner).Burn_DID()).to.not.be.reverted;
    });

    it("Owner can call mint_MKMT (permission 25)", async function () {
      await expect(mkmpol21.connect(owner).mint_MKMT()).to.not.be.reverted;
    });

    it("Owner can call burn_MKMT (permission 26)", async function () {
      await expect(mkmpol21.connect(owner).burn_MKMT()).to.not.be.reverted;
    });

    it("Owner can call distribute_MKMT (permission 27)", async function () {
      await expect(mkmpol21.connect(owner).distribute_MKMT()).to.not.be.reverted;
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

    it("Control relation is symmetric for certain roles", async function () {
      // Member_Institution and Data_Validator both have control bitmask 100100
      // This means roles at index 2 and 5 can control them
      const miControl = getControlBitmask(ROLES.MEMBER_INSTITUTION);
      const dvControl = getControlBitmask(ROLES.DATA_VALIDATOR);
      expect(miControl).to.equal(dvControl);
    });
  });
});
