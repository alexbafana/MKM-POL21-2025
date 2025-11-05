"use client";
import deployedContracts from "~~/contracts/deployedContracts";
import { useChainId } from "wagmi";

/** Returns the current MKMPOL21 address for the active chain. */
export const useDeployedMkmp = () => {
  const chainId = useChainId();
  // Scaffold-ETH 2 writes contracts under [chainId].contracts
  return deployedContracts?.[chainId]?.contracts?.MKMPOL21?.address as
    | `0x${string}`
    | undefined;
};
