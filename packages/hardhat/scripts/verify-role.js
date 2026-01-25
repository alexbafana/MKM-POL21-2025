const hre = require("hardhat");

/**
 * Script to verify a user's role on the MKMPOL21 contract
 * Usage: npx hardhat run scripts/verify-role.js --network localhost
 * Or: node scripts/verify-role.js <userAddress>
 */
async function main() {
  const userAddress = process.argv[2] || "0x787759fD65983eCB94986ab01FE125750d329000";
  
  console.log(`\n🔍 Verifying role for address: ${userAddress}\n`);

  // Get the deployed contract
  const deployedContracts = require("../deployedContracts.ts");
  const chainId = hre.network.config.chainId || 31337;
  const contractData = deployedContracts[chainId]?.MKMPOL21;

  if (!contractData) {
    console.error(`❌ Contract not found for chainId ${chainId}`);
    console.log("Available chainIds:", Object.keys(deployedContracts));
    return;
  }

  const contractAddress = contractData.address;
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Chain ID: ${chainId}\n`);

  // Get contract instance
  const MKMPOL21 = await hre.ethers.getContractAt("MKMPOL21", contractAddress);

  // Check role
  try {
    const role = await MKMPOL21.hasRole(userAddress);
    const roleValue = Number(role);
    const roleIndex = roleValue & 31;

    console.log(`✅ Role Value: ${roleValue}`);
    console.log(`✅ Role Index: ${roleIndex}`);

    const roleNames = {
      0: "Member Institution",
      1: "Ordinary User",
      2: "MFSSIA Guardian Agent",
      3: "Eliza Data Extractor Agent",
      4: "Data Validator",
      5: "MKMPOL21 Owner",
      6: "Consortium",
      7: "Validation Committee",
      8: "Dispute Resolution Board",
    };

    if (roleValue === 0) {
      console.log(`❌ Status: NO ROLE ASSIGNED`);
    } else {
      const roleName = roleNames[roleIndex] || "Unknown";
      console.log(`✅ Role Name: ${roleName}`);
      console.log(`✅ Status: ROLE ASSIGNED`);
    }

    // Check attestation if exists
    try {
      const attestation = await MKMPOL21.getAttestation(userAddress);
      if (attestation.verified) {
        console.log(`\n📜 Attestation Status: VERIFIED`);
        console.log(`📜 Attestation UAL: ${attestation.ual}`);
        console.log(`📜 Expires At: ${new Date(Number(attestation.expiresAt) * 1000).toLocaleString()}`);
        console.log(`📜 Is Expired: ${attestation.isExpired ? "YES" : "NO"}`);
      } else {
        console.log(`\n📜 Attestation Status: NOT VERIFIED`);
      }
    } catch (attestationError) {
      console.log(`\n📜 Attestation: Not found or error reading`);
    }

  } catch (error) {
    console.error(`❌ Error reading role:`, error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

