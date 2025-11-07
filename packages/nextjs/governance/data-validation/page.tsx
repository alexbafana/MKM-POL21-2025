"use client";

import Link from "next/link";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

const PM_ABI = [
  {
    name: "submit_data_point_inclusion_proposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dataUri", type: "string" },
      { name: "contentHash", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  { name: "Reject_data_point", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "edit_data_point_inclusion_proposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  { name: "add_metadata", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "inspect_data_point", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const useMkmp = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId as keyof typeof deployedContracts]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function DataValidationGA() {
  const mkmp = useMkmp();
  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  // minimal form for submit_data_point_inclusion_proposal
  const onSubmitDP = (form: FormData) => {
    const dataUri = String(form.get("dataUri") || "");
    const contentHash = String(form.get("contentHash") || "0x");
    const metadataHash = String(form.get("metadataHash") || "0x");
    if (!mkmp) return;
    writeContract({
      address: mkmp,
      abi: PM_ABI,
      functionName: "submit_data_point_inclusion_proposal",
      args: [dataUri, contentHash as `0x${string}`, metadataHash as `0x${string}`],
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="link">
          ← Home
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-2">Data Validation</h1>
      <p className="opacity-70 mb-6">Interact with validation flows (permissions 6–10).</p>

      <form action={fd => onSubmitDP(fd)} className="bg-base-100 rounded-2xl p-5 shadow mb-6">
        <h3 className="font-semibold mb-3">Submit Inclusion Proposal</h3>
        <label className="form-control mb-3">
          <span className="label-text">dataUri</span>
          <input name="dataUri" className="input input-bordered" placeholder="ipfs://..." />
        </label>
        <label className="form-control mb-3">
          <span className="label-text">contentHash (bytes32)</span>
          <input name="contentHash" className="input input-bordered font-mono" placeholder="0x..." />
        </label>
        <label className="form-control mb-4">
          <span className="label-text">metadataHash (bytes32)</span>
          <input name="metadataHash" className="input input-bordered font-mono" placeholder="0x..." />
        </label>
        <button className="btn btn-primary" disabled={isPending}>
          Submit
        </button>
      </form>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "Reject_data_point", args: [] })}
        >
          Reject Data Point
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() =>
            writeContract({ address: mkmp!, abi: PM_ABI, functionName: "edit_data_point_inclusion_proposal", args: [] })
          }
        >
          Edit Inclusion Proposal
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "add_metadata", args: [] })}
        >
          Add Metadata
        </button>
        <button
          className="btn"
          disabled={!mkmp || isPending}
          onClick={() => writeContract({ address: mkmp!, abi: PM_ABI, functionName: "inspect_data_point", args: [] })}
        >
          Inspect Data Point
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
