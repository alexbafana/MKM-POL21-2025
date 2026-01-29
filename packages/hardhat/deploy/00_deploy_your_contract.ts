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

  // Get signers for later use
  const signers = await ethers.getSigners();

  // Check if ownership was already transferred (for idempotency)
  const tokenContract = await ethers.getContractAt("VotingPowerToken", token.address);
  const currentOwner = await tokenContract.owner();
  const ownershipAlreadyTransferred = currentOwner.toLowerCase() === mkmpm.address.toLowerCase();

  if (!ownershipAlreadyTransferred) {
    // 2.5) Mint voting tokens to test accounts BEFORE ownership transfer
    // (VotingPowerToken auto-self-delegates on first mint, no manual delegate needed)
    const mintAmount = ethers.parseEther("1");
    for (const idx of [1, 2, 3]) {
      if (signers[idx]) {
        await execute("VotingPowerToken", { from: deployer, log: true }, "mint", signers[idx].address, mintAmount);
        log(`Minted token for signer[${idx}]: ${signers[idx].address}`);
      }
    }

    // 3) Transfer token ownership to MKMPOL21, then set token reference
    await execute("VotingPowerToken", { from: deployer, log: true }, "transferOwnership", mkmpm.address);
    await execute("MKMPOL21", { from: deployer, log: true }, "setVotingToken", token.address);
    log(`MKMPOL21 votingToken set to: ${token.address}`);
  } else {
    log("Token ownership already transferred to MKMPOL21, skipping mint and transfer steps.");
  }

  // 4) Optional governance contracts
  const challengePeriod = 60 * 60 * 24 * 3; // 3 days

  const deployIfPresent = async (name: string, args: any[]): Promise<string | null> => {
    if (!(await exists(name))) {
      log(`Skip: ${name} not found`);
      return null;
    }
    const d = await deploy(name, {
      from: deployer,
      args,
      log: true,
      autoMine: true,
    });
    log(`${name} at: ${d.address}`);
    return d.address;
  };

  // Consortium uses optimistic governance with challenge period (3 args)
  const consortium = await deployIfPresent("Consortium", [token.address, mkmpm.address, challengePeriod]);
  // ValidationCommittee: 0 delay, 30 blocks voting, 34% quorum (= 1 out of 3 validators)
  const validation = await deployIfPresent("ValidationCommittee", [token.address, mkmpm.address, 0, 30, 34]);
  // DisputeResolutionBoard uses simple majority (2 args)
  const dispute = await deployIfPresent("DisputeResolutionBoard", [token.address, mkmpm.address]);

  // Get MKMPOL21 contract instance for idempotency checks
  const mkmp = await ethers.getContractAt("MKMPOL21", mkmpm.address);

  // 5) Initialize committees ONLY if all three contracts exist and not already initialized
  if (consortium && validation && dispute) {
    // Check if committees are already initialized by checking if consortium address has a role
    const consortiumRole = await mkmp.hasRole(consortium);
    const committeesAlreadyInitialized = Number(consortiumRole) !== 0;

    if (!committeesAlreadyInitialized) {
      await execute("MKMPOL21", { from: deployer, log: true }, "initializeCommittees", consortium, validation, dispute);
      log("Committees initialized.");
    } else {
      log("Committees already initialized, skipping.");
    }
  } else {
    log("Skipping initializeCommittees — not all committee contracts are deployed. Owner preserved.");
  }

  // 6) Deploy GADataValidation (Governance Area for Data Validation)
  const gaDataValidation = await deployIfPresent("GADataValidation", [mkmpm.address, deployer]);
  if (gaDataValidation) {
    log(`GADataValidation at: ${gaDataValidation}`);
  }

  // 7) Assign Data_Validator role (index 4, value 1156) to agent wallet
  const validatorAddress = process.env.BDI_VALIDATOR_ADDRESS || signers[2]?.address;
  if (validatorAddress) {
    // Check if role is already assigned
    const existingRole = await mkmp.hasRole(validatorAddress);
    const roleIndex = Number(existingRole) & 31;

    if (roleIndex === 0) {
      await execute("MKMPOL21", { from: deployer, log: true }, "assignRole", validatorAddress, 1156);
      log(`Data_Validator role assigned to: ${validatorAddress}`);
    } else {
      log(`Role already assigned to ${validatorAddress} (index: ${roleIndex}), skipping.`);
    }
  }

  // 8) Sanity check: confirm deployer still has Owner (index 5)
  const rawRole = await mkmp.hasRole(deployer); // uint32 (Ethers v6 returns bigint)
  const ownerIndex = Number(rawRole) & 31;
  log(`Deployer ${deployer} role index: ${ownerIndex} (expect 5)`);

  log("==== MKMPOL21 DAO: deploy end ====");
};

export default func;
func.tags = ["MKMPOL21-DAO"];
