const hre = require("hardhat");

async function main() {
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  console.log("Checking contract deployment at:", contractAddress);

  const code = await hre.ethers.provider.getCode(contractAddress);
  console.log("Contract code length:", code.length);
  console.log("Has code:", code !== "0x");

  if (code !== "0x") {
    const MKMPOL21 = await hre.ethers.getContractAt("MKMPOL21", contractAddress);

    try {
      // Try calling hasRole with a test address
      const testAddress = "0x0000000000000000000000000000000000000001";
      const roleResult = await MKMPOL21.hasRole(testAddress);
      console.log("hasRole call successful, result:", roleResult);
    } catch (error) {
      console.log("hasRole call failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
