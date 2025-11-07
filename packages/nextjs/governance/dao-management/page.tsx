"use client";

import Link from "next/link";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const PM_ABI = [
  { name: "Issue_DID", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "Burn_DID", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "mint_MKMT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "burn_MKMT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "distribute_MKMT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const useMkmp = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function DaoManagementGA() {
  const mkmp = useMkmp();
  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="link">
          ← Home
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-2">DAO Management</h1>
      <p className="opacity-70 mb-6">DID and token admin functions (perm 4–5/25–27 as per PM).</p>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          className="btn btn-primary"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "Issue_DID", args: [] })}
        >
          Issue DID
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "Burn_DID", args: [] })}
        >
          Burn DID
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "mint_MKMT", args: [] })}
        >
          Mint MKMT
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "burn_MKMT", args: [] })}
        >
          Burn MKMT
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "distribute_MKMT", args: [] })}
        >
          Distribute MKMT
        </button>
      </div>

      {writeErr && (
        <div className="alert alert-error mt-6">
          <span className="font-mono">{(writeErr as any)?.shortMessage ?? writeErr.message}</span>
        </div>
      )}
      {txHash && (
        <div className="alert alert-info mt-6">
          <span className="font-mono">tx: {txHash}</span>
        </div>
      )}
      {isMined && (
        <div className="alert alert-success mt-6">
          <span>✅ Transaction included</span>
        </div>
      )}
    </div>
  );
}
