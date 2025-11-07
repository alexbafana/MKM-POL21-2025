"use client";

import { useChainId } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

/** Returns the current MKMPOL21 address for the active chain. */
export const useDeployedMkmp = () => {
  const chainId = useChainId();
  // Scaffold-ETH 2 writes contracts under [chainId].ContractName
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};
