/**
 * Setup BDI Agent Roles
 *
 * This script assigns DAO roles to the BDI validation agent accounts.
 * Must be run by the Owner account (deployer) after contract deployment.
 *
 * Usage:
 *   npx hardhat run scripts/setup-agent-roles.ts --network localhost
 */

import { ethers } from "hardhat";
import { AGENT_ACCOUNTS } from "../config/agentAccounts";

async function main() {
  console.log("=".repeat(60));
  console.log("BDI Agent Role Setup");
  console.log("=".repeat(60));

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log(`\nDeployer (Owner) address: ${deployer.address}`);

  // Get deployed MKMPOL21 contract
  let mkmpol21Address: string;
  try {
    const deployment = await import("../deployments/localhost/MKMPOL21.json");
    mkmpol21Address = deployment.address;
  } catch {
    // Use the address from deployedContracts.ts
    mkmpol21Address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    console.log("Note: Using deployed MKMPOL21 address");
  }

  console.log(`MKMPOL21 contract address: ${mkmpol21Address}`);

  const mkmpol21 = await ethers.getContractAt("MKMPOL21", mkmpol21Address);

  // Verify deployer is Owner
  const deployerRole = await mkmpol21.hasRole(deployer.address);
  const deployerRoleIndex = Number(deployerRole) & 31;

  if (deployerRoleIndex !== 5) {
    console.error(`\nError: Deployer does not have Owner role.`);
    console.error(`  Current role index: ${deployerRoleIndex}`);
    console.error(`  Expected: 5 (MKMPOL21Owner)`);
    console.error(`\nEnsure you are running this script with the deployer account.`);
    process.exit(1);
  }

  console.log(`Deployer role verified: MKMPOL21Owner (index 5)`);

  // Assign roles to each agent
  console.log("\n" + "-".repeat(60));
  console.log("Assigning Agent Roles");
  console.log("-".repeat(60));

  for (const agent of Object.values(AGENT_ACCOUNTS)) {
    console.log(`\n${agent.name}`);
    console.log(`  Address: ${agent.address}`);
    console.log(`  Target Role: ${agent.role} (value: ${agent.roleValue}, index: ${agent.roleIndex})`);

    // Check current role
    const currentRole = await mkmpol21.hasRole(agent.address);
    const currentRoleValue = Number(currentRole);

    if (currentRoleValue !== 0) {
      if (currentRoleValue === agent.roleValue) {
        console.log(`  [SKIP] Already has correct role`);
        continue;
      } else {
        console.log(`  [WARN] Already has different role: ${currentRoleValue}`);
        console.log(`  Attempting to reassign...`);
      }
    }

    // Assign role
    try {
      const tx = await mkmpol21.connect(deployer).assignRole(agent.address, agent.roleValue);
      await tx.wait();
      console.log(`  [OK] Role assigned, tx: ${tx.hash}`);

      // Verify assignment
      const newRole = await mkmpol21.hasRole(agent.address);
      if (Number(newRole) === agent.roleValue) {
        console.log(`  [OK] Verified: role = ${newRole}`);
      } else {
        console.log(`  [WARN] Verification failed: expected ${agent.roleValue}, got ${newRole}`);
      }
    } catch (error: any) {
      console.error(`  [ERROR] Failed to assign role: ${error.message}`);
      if (error.reason) {
        console.error(`  Revert reason: ${error.reason}`);
      }
    }
  }

  // Grant required permissions
  console.log("\n" + "-".repeat(60));
  console.log("Granting Required Permissions");
  console.log("-".repeat(60));

  // Permission 4 (VALIDATE_RDF) is needed by Data_Validator role
  // Check if permission already exists for the role
  const dataValidatorAgents = [AGENT_ACCOUNTS.SYNTAX_VALIDATOR, AGENT_ACCOUNTS.SEMANTIC_VALIDATOR];

  for (const agent of dataValidatorAgents) {
    console.log(`\nGranting permissions to ${agent.name}...`);

    for (const permIndex of agent.requiredPermissions) {
      const hasPermission = await mkmpol21.has_permission(agent.address, permIndex);

      if (hasPermission) {
        console.log(`  [SKIP] Already has permission ${permIndex}`);
        continue;
      }

      try {
        // Grant permission to the role (not the address)
        const tx = await mkmpol21.connect(deployer).grantPermission(agent.roleValue, permIndex);
        await tx.wait();
        console.log(`  [OK] Granted permission ${permIndex} to role ${agent.roleValue}, tx: ${tx.hash}`);

        // Verify
        const nowHasPermission = await mkmpol21.has_permission(agent.address, permIndex);
        if (nowHasPermission) {
          console.log(`  [OK] Verified: agent now has permission ${permIndex}`);
        } else {
          console.log(`  [WARN] Verification failed: agent still doesn't have permission ${permIndex}`);
        }
      } catch (error: any) {
        console.error(`  [ERROR] Failed to grant permission ${permIndex}: ${error.message}`);
        // This might fail if the permission is already set at role level - that's OK
      }
    }
  }

  // Permission 8 (SUBMIT_RDF) is needed by Member_Institution role
  const submitterAgent = AGENT_ACCOUNTS.DAO_SUBMITTER;
  console.log(`\nGranting permissions to ${submitterAgent.name}...`);

  for (const permIndex of submitterAgent.requiredPermissions) {
    const hasPermission = await mkmpol21.has_permission(submitterAgent.address, permIndex);

    if (hasPermission) {
      console.log(`  [SKIP] Already has permission ${permIndex}`);
      continue;
    }

    try {
      const tx = await mkmpol21.connect(deployer).grantPermission(submitterAgent.roleValue, permIndex);
      await tx.wait();
      console.log(`  [OK] Granted permission ${permIndex} to role ${submitterAgent.roleValue}, tx: ${tx.hash}`);

      const nowHasPermission = await mkmpol21.has_permission(submitterAgent.address, permIndex);
      if (nowHasPermission) {
        console.log(`  [OK] Verified: agent now has permission ${permIndex}`);
      }
    } catch (error: any) {
      console.error(`  [ERROR] Failed to grant permission ${permIndex}: ${error.message}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Setup Complete - Summary");
  console.log("=".repeat(60));

  for (const agent of Object.values(AGENT_ACCOUNTS)) {
    const role = await mkmpol21.hasRole(agent.address);
    const roleIndex = Number(role) & 31;
    const permissions = [];

    for (const permIndex of [4, 5, 6, 8]) {
      if (await mkmpol21.has_permission(agent.address, permIndex)) {
        permissions.push(permIndex);
      }
    }

    console.log(`\n${agent.name}:`);
    console.log(`  Address: ${agent.address}`);
    console.log(`  Role: ${role} (index: ${roleIndex})`);
    console.log(`  Permissions: [${permissions.join(", ")}]`);
    console.log(`  Status: ${roleIndex === agent.roleIndex ? "✅ OK" : "❌ MISMATCH"}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("BDI Agent Role Setup Complete");
  console.log("=".repeat(60));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
