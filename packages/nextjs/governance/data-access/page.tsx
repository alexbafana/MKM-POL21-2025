"use client";

import Link from "next/link";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const PM_ABI = [
  { name: "submit_query_to_eliza_agent", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const useMkmp = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function DataAccessGA() {
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
      <h1 className="text-3xl font-bold mb-2">Data Access</h1>
      <p className="opacity-70 mb-6">Submit queries to the Eliza agent (perm 22).</p>

      <button
        className="btn btn-primary"
        disabled={!mkmp || isPending}
        onClick={() =>
          writeContract({ address: mkmp!, abi: PM_ABI, functionName: "submit_query_to_eliza_agent", args: [] })
        }
      >
        Submit Query to Eliza Agent
      </button>

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
