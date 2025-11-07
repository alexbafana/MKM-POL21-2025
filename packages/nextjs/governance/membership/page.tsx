"use client";

import Link from "next/link";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const PM_ABI = [
  { name: "onboard_ordinary_user", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "onboard_institution", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "remove_ordinary_member", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "remove_institution", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const useMkmp = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function MembershipGA() {
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
      <h1 className="text-3xl font-bold mb-2">Membership Management</h1>
      <p className="opacity-70 mb-6">Onboard/remove members and institutions (perm 18–21).</p>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          className="btn btn-primary"
          disabled={!mkmp || isPending}
          onClick={() =>
            writeContract({ address: mkmp!, abi: PM_ABI, functionName: "onboard_ordinary_user", args: [] })
          }
        >
          Onboard Ordinary User
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "onboard_institution", args: [] })}
        >
          Onboard Institution
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() =>
            writeContract({ address: mkmp!, abi: PM_ABI, functionName: "remove_ordinary_member", args: [] })
          }
        >
          Remove Ordinary Member
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "remove_institution", args: [] })}
        >
          Remove Institution
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
