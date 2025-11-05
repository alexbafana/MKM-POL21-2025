"use client";

import Link from "next/link";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const PM_ABI = [
  { name:"has_permission", type:"function", stateMutability:"view", inputs:[{name:"user",type:"address"},{name:"_permissionIndex",type:"uint64"}], outputs:[{type:"bool"}]},
  // If you later expose the 0–3 functions in PM, wire them here (they are commented out in your PM)
] as const;

const useMkmp = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId]?.contracts?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function DisputeResolutionGA() {
  const mkmp = useMkmp();
  const { isPending, data: txHash, error: writeErr } = useWriteContract();
  const { isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/" className="link">← Home</Link></div>
      <h1 className="text-3xl font-bold mb-2">Dispute Resolution</h1>
      <p className="opacity-70 mb-6">UI scaffolding: when you un-comment the corresponding PM functions, add buttons here.</p>

      <div className="alert alert-info">
        The PM methods for Dispute Resolution (perm 0–3) are commented out in your PM. Once you enable them, you can add calls here.
      </div>
      {writeErr && <div className="alert alert-error mt-4"><span className="font-mono">{(writeErr as any)?.shortMessage ?? writeErr.message}</span></div>}
      {isMined && <div className="alert alert-success mt-4">✅ Transaction included</div>}
    </div>
  );
}
