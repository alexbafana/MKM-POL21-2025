#!/usr/bin/env node

/**
 * Check user role and diagnose onboarding issues
 * Usage: node check-role.js <your-address>
 */

const { ethers } = require("hardhat");

async function main() {
  // Get address from command line or environment variable or use default
  const address = process.env.CHECK_ADDRESS || process.argv[2] || "0x787759fD65983eCB94986ab01FE125750d329000";

  if (!address || address === "undefined") {
    console.log("\n❌ Please provide an address:");
    console.log("   CHECK_ADDRESS=0x... npx hardhat run scripts/check-role.js --network localhost\n");
    process.exit(1);
  }

  console.log("\n🔍 Checking role for address:", address);
  console.log("━".repeat(60));

  try {
    // Get deployed contract
    const MKMPOL21 = await ethers.getContractFactory("MKMPOL21");
    const deployedAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Updated after deployment
    const mkmpol = MKMPOL21.attach(deployedAddress);

    // Check role
    const roleValue = await mkmpol.hasRole(address);
    const roleIndex = Number(roleValue) & 31;

    const roleNames = {
      0: "Member_Institution",
      1: "Ordinary_User",
      2: "MFSSIA_Guardian_Agent",
      3: "Eliza_Data_Extractor_Agent",
      4: "Data_Validator",
      5: "MKMPOL21Owner",
      6: "Consortium",
      7: "Validation_Committee",
      8: "Dispute_Resolution_Board"
    };

    console.log("\n📊 Role Status:");
    console.log("   Role Value:", roleValue.toString());
    console.log("   Role Index:", roleIndex);
    console.log("   Role Name:", roleValue === 0n ? "❌ NO ROLE" : `✅ ${roleNames[roleIndex]}`);

    // Check if onboarding functions exist
    console.log("\n🔧 Contract Function Check:");
    try {
      // Try to call the function (will revert but we just want to see if it exists)
      await mkmpol.onboard_institution_with_attestation.staticCall("test");
    } catch (error) {
      if (error.message.includes("User already has a role")) {
        console.log("   ✅ onboard_institution_with_attestation exists");
        console.log("   ⚠️  You already have a role assigned!");
      } else if (error.message.includes("Invalid attestation")) {
        console.log("   ✅ onboard_institution_with_attestation exists");
      } else {
        console.log("   ❌ Function might not exist or other error:", error.message.substring(0, 100));
      }
    }

    // Provide recommendations
    console.log("\n💡 Recommendations:");
    if (roleValue !== 0n) {
      console.log("   ⚠️  You already have a role assigned!");
      console.log("   ⚠️  The onboarding process requires NO existing role");
      console.log("\n   Options:");
      console.log("   1. Use a different wallet address that has no role");
      console.log("   2. Have an admin revoke your current role using:");
      console.log(`      - Go to /admin page`);
      console.log(`      - Revoke role ${roleNames[roleIndex]} from ${address}`);
    } else {
      console.log("   ✅ No role assigned - onboarding should work");
      console.log("   ℹ️  Make sure you have enough ETH for gas fees");
      console.log("   ℹ️  Try onboarding again at /onboarding/institution");
    }

    console.log("\n" + "━".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   1. Local blockchain is running (yarn chain)");
    console.log("   2. Contract is deployed (yarn deploy)");
    console.log("   3. Using the correct contract address\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
