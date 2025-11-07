import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const mkmpAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const targetAddress = "0x787759fD65983eCB94986ab01FE125750d329000";

  const MKMPOL21 = await ethers.getContractAt("MKMPOL21", mkmpAddress);

  console.log("Signer address:", signer.address);
  console.log("Target address:", targetAddress);

  // Check signer's current role
  const signerRole = await MKMPOL21.hasRole(signer.address);
  console.log("Signer role:", signerRole.toString());
  console.log("Signer role index:", Number(signerRole) & 31);

  // Check target's current role
  const targetRole = await MKMPOL21.hasRole(targetAddress);
  console.log("Target role:", targetRole.toString());
  console.log("Target role index:", Number(targetRole) & 31);

  // Try to assign Ordinary_User role (1153) to target
  console.log("\nAttempting to assign Ordinary_User (1153) to target...");
  try {
    const tx = await MKMPOL21.assignRole(targetAddress, 1153);
    await tx.wait();
    console.log("✅ Success! Transaction:", tx.hash);

    const newRole = await MKMPOL21.hasRole(targetAddress);
    console.log("Target new role:", newRole.toString());
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
  }

  // Now try assigning a role to the target (who is also the signer in frontend)
  // This simulates what happens when the owner tries to assign role to themselves
  console.log("\n\nAttempting to assign Member_Institution (1152) to target (who already has Owner role 1029)...");
  try {
    const tx = await MKMPOL21.connect(signer).assignRole(targetAddress, 1152);
    await tx.wait();
    console.log("✅ Success! Transaction:", tx.hash);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
