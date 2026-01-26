/**
 * This deploy script runs generateTsAbis to update deployedContracts.ts
 * after contract deployment. This ensures the frontend has correct ABIs
 * and addresses both when running `yarn deploy` and when `hardhat node`
 * auto-deploys on startup.
 */
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import generateTsAbis from "../scripts/generateTsAbis";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await generateTsAbis(hre);
};

export default func;
func.tags = ["GenerateTsAbis"];
func.dependencies = ["MKMPOL21-DAO"];
func.runAtTheEnd = true;
