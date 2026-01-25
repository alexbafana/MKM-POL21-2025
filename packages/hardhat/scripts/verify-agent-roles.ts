/**
 * Verify BDI Agent Roles
 *
 * This script verifies that all BDI validation agent accounts have
 * the correct roles and permissions assigned.
 *
 * Usage:
 *   npx hardhat run scripts/verify-agent-roles.ts --network localhost
 */

import { ethers } from "hardhat";
import { AGENT_ACCOUNTS } from "../config/agentAccounts";

// Role names for display
const ROLE_NAMES: Record<number, string> = {
  0: "Member_Institution",
  1: "Ordinary_User",
  2: "MFSSIA_Guardian_Agent",
  3: "Eliza_Data_Extractor_Agent",
  4: "Data_Validator",
  5: "MKMPOL21Owner",
  6: "Consortium",
  7: "Validation_Committee",
  8: "Dispute_Resolution_Board",
};

// Permission names
const PERMISSION_NAMES: Record<number, string> = {
  4: "VALIDATE_RDF",
  5: "PUBLISH_TO_DKG",
  6: "APPROVE_RDF",
  8: "SUBMIT_RDF",
};

async function main() {
  console.log("=".repeat(60));
  console.log("BDI Agent Role Verification");
  console.log("=".repeat(60));

  // Get deployed MKMPOL21 contract
  let mkmpol21Address: string;
  try {
    const deployments = await import("../deployments/localhost/MKMPOL21.json");
    mkmpol21Address = deployments.address;
  } catch {
    mkmpol21Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log("Note: Using fallback MKMPOL21 address for localhost");
  }

  console.log(`\nMKMPOL21 contract address: ${mkmpol21Address}`);

  const mkmpol21 = await ethers.getContractAt("MKMPOL21", mkmpol21Address);

  let allValid = true;
  const results: Array<{
    agent: string;
    address: string;
    expectedRole: string;
    actualRole: string;
    roleMatch: boolean;
    permissions: string[];
    permissionMatch: boolean;
  }> = [];

  // Check each agent
  for (const agent of Object.values(AGENT_ACCOUNTS)) {
    console.log(`\nChecking ${agent.name}...`);

    // Get current role
    const currentRole = await mkmpol21.hasRole(agent.address);
    const roleValue = Number(currentRole);
    const roleIndex = roleValue & 31;
    const actualRoleName = ROLE_NAMES[roleIndex] || `Unknown(${roleIndex})`;

    // Check role match
    const roleMatch = roleValue === agent.roleValue;

    // Check permissions
    const permissions: string[] = [];
    const missingPermissions: number[] = [];

    for (const permIndex of [4, 5, 6, 8]) {
      const hasPermission = await mkmpol21.has_permission(agent.address, permIndex);
      if (hasPermission) {
        permissions.push(PERMISSION_NAMES[permIndex] || `P${permIndex}`);
      }

      // Check if this permission was required
      if (agent.requiredPermissions.includes(permIndex) && !hasPermission) {
        missingPermissions.push(permIndex);
      }
    }

    const permissionMatch = missingPermissions.length === 0;

    if (!roleMatch || !permissionMatch) {
      allValid = false;
    }

    results.push({
      agent: agent.name,
      address: agent.address,
      expectedRole: agent.role,
      actualRole: actualRoleName,
      roleMatch,
      permissions,
      permissionMatch,
    });

    // Display result
    console.log(`  Address: ${agent.address}`);
    console.log(`  Expected Role: ${agent.role} (${agent.roleValue})`);
    console.log(`  Actual Role: ${actualRoleName} (${roleValue})`);
    console.log(`  Role Match: ${roleMatch ? "✅" : "❌"}`);
    console.log(`  Permissions: [${permissions.join(", ")}]`);
    console.log(`  Required: [${agent.requiredPermissions.map(p => PERMISSION_NAMES[p]).join(", ")}]`);
    console.log(`  Permission Match: ${permissionMatch ? "✅" : "❌"}`);

    if (missingPermissions.length > 0) {
      console.log(`  Missing Permissions: [${missingPermissions.map(p => PERMISSION_NAMES[p]).join(", ")}]`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Verification Summary");
  console.log("=".repeat(60));

  console.log("\n| Agent                  | Role Match | Permissions Match |");
  console.log("|------------------------|------------|-------------------|");

  for (const result of results) {
    const agentPadded = result.agent.padEnd(22);
    const roleMark = result.roleMatch ? "✅" : "❌";
    const permMark = result.permissionMatch ? "✅" : "❌";
    console.log(`| ${agentPadded} | ${roleMark.padEnd(10)} | ${permMark.padEnd(17)} |`);
  }

  console.log("\n" + "=".repeat(60));

  if (allValid) {
    console.log("✅ All BDI agents have correct roles and permissions!");
    console.log("=".repeat(60));
    process.exit(0);
  } else {
    console.log("❌ Some agents have incorrect roles or missing permissions.");
    console.log("   Run setup-agent-roles.ts to fix.");
    console.log("=".repeat(60));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
