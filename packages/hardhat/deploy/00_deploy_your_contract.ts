// packages/hardhat/deploy/00_deploy_your_contract.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, artifacts, ethers } = hre;
  const { deploy, execute, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const exists = async (name: string) => {
    try {
      await artifacts.readArtifact(name);
      return true;
    } catch {
      return false;
    }
  };

  log("==== MKMPOL21 DAO: deploy start ====");

  // 1) VotingPowerToken (plain ERC20Votes, non-upgradeable)
  const token = await deploy("VotingPowerToken", {
    from: deployer,
    args: ["MKMPOL Voting Power", "MKMVP", deployer], // name, symbol, initialOwner
    log: true,
    autoMine: true,
  });

  // 2) MKMPOL21 (permission manager) — constructor sets deployer as Owner (index 5)
  const mkmpm = await deploy("MKMPOL21", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  log(`MKMPOL21 at: ${mkmpm.address}`);

  // 3) Transfer token ownership to MKMPOL21
  await execute("VotingPowerToken", { from: deployer, log: true }, "transferOwnership", mkmpm.address);

  // 4) Optional governance contracts
  const challengePeriod = 60 * 60 * 24 * 3; // 3 days

  const deployIfPresent = async (name: string): Promise<string | null> => {
    if (!(await exists(name))) {
      log(`Skip: ${name} not found`);
      return null;
    }
    const d = await deploy(name, {
      from: deployer,
      args: [token.address, mkmpm.address, challengePeriod],
      log: true,
      autoMine: true,
    });
    log(`${name} at: ${d.address}`);
    return d.address;
    };

  const consortium = await deployIfPresent("Consortium");
  const validation = await deployIfPresent("Validation_Committee");
  const dispute    = await deployIfPresent("Dispute_Resolution_Board");

  // 5) Initialize committees ONLY if all three contracts exist
  if (consortium && validation && dispute) {
    await execute(
      "MKMPOL21",
      { from: deployer, log: true },
      "initializeCommittees",
      consortium,
      validation,
      dispute
    );
    log("Committees initialized.");
  } else {
    log("Skipping initializeCommittees — not all committee contracts are deployed. Owner preserved.");
  }

  // 6) Sanity check: confirm deployer still has Owner (index 5)
  const mkmp = await ethers.getContractAt("MKMPOL21", mkmpm.address);
  const rawRole = await mkmp.hasRole(deployer); // uint32 (Ethers v6 returns bigint)
  const ownerIndex = Number(rawRole) & 31;
  log(`Deployer ${deployer} role index: ${ownerIndex} (expect 5)`);

  log("==== MKMPOL21 DAO: deploy end ====");
};

export default func;
func.tags = ["MKMPOL21-DAO"];
