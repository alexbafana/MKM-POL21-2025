// packages/hardhat/tasks/grant-owner.ts
import { task } from "hardhat/config";

task("grant-owner", "Grants MKMPOL21Owner role to an address")
  .addParam("to", "Recipient address")
  .setAction(async ({ to }, hre) => {
    const { ethers, deployments } = hre;

    // Dynamic import to avoid chicken-and-egg problem with typechain-types
    const { MKMPOL21__factory } = await import("../typechain-types");

    // read deployed address from hardhat-deploy
    const dep = await deployments.get("MKMPOL21");
    const [signer] = await ethers.getSigners();

    // strongly-typed contract instance
    const mkmp = MKMPOL21__factory.connect(dep.address, signer);

    // (optional) show who we think is owner index at the moment
    const rawRole = await mkmp.hasRole(await signer.getAddress());
    const myIndex = Number(rawRole) & 31;
    console.log(`Signer ${await signer.getAddress()} role index: ${myIndex}`);

    // all_roles[5] == 1029 for MKMPOL21Owner in your contract
    const OWNER_ROLE = 1029;

    console.log(`Granting OWNER (${OWNER_ROLE}) to ${to} using MKMPOL21 at ${dep.address}`);
    const tx = await mkmp.assignRole(to, OWNER_ROLE); // will revert if sender can’t control
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log(`✅ Granted owner role to ${to}`);
  });
