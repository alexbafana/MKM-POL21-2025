"use client";

import { useState } from "react";
import Link from "next/link";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const GOV_ABI = [
  { name:"propose", type:"function", stateMutability:"nonpayable", inputs:[{type:"address[]",name:"targets"},{type:"uint256[]",name:"values"},{type:"bytes[]",name:"calldatas"},{type:"string",name:"description"}], outputs:[{type:"uint256"}]},
  { name:"castVote", type:"function", stateMutability:"nonpayable", inputs:[{type:"uint256",name:"proposalId"},{type:"uint8",name:"support"}], outputs:[{type:"uint256"}] },
] as const;

const useAddr = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return deployedContracts?.[chainId]?.contracts?.Dispute_Resolution_Board?.address as `0x${string}` | undefined;
};

export default function DisputeBoardPage() {
  const chainId = useChainId();
  const gov = useAddr();

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [calldataHex, setCalldataHex] = useState("0x");
  const onPropose = () => {
    if (!gov) return;
    writeContract({ address: gov, abi: GOV_ABI, functionName: "propose", args: [[target as `0x${string}`],[0n],[calldataHex as `0x${string}`], desc] });
  };
  const [proposalId, setProposalId] = useState<string>("");
  const [support, setSupport] = useState<number>(1);
  const onVote = () => {
    if (!gov) return;
    writeContract({ address: gov, abi: GOV_ABI, functionName: "castVote", args: [BigInt(proposalId), support] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/committees" className="link">← Committees</Link></div>
      <h1 className="text-3xl font-bold mb-1">Dispute Resolution Board</h1>
      <p className="opacity-70 mb-6">Chain {chainId} • Contract {gov ? <Address address={gov} /> : "not deployed"}</p>

      {!gov && <div className="alert alert-warning">Dispute Resolution Board contract isn’t deployed on this chain.</div>}

      {gov && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-base-100 rounded-2xl p-5 shadow">
            <h3 className="font-semibold mb-3">Propose</h3>
            <label className="form-control mb-3"><span className="label-text">Target</span>
              <input className="input input-bordered font-mono" value={target} onChange={e=>setTarget(e.target.value.trim())}/></label>
            <label className="form-control mb-3"><span className="label-text">Calldata (hex)</span>
              <input className="input input-bordered font-mono" value={calldataHex} onChange={e=>setCalldataHex(e.target.value.trim())}/></label>
            <label className="form-control mb-4"><span className="label-text">Description</span>
              <input className="input input-bordered" value={desc} onChange={e=>setDesc(e.target.value)}/></label>
            <button className="btn btn-primary" disabled={isPending||isMining} onClick={onPropose}>Submit Proposal</button>
          </div>

          <div className="bg-base-100 rounded-2xl p-5 shadow">
            <h3 className="font-semibold mb-3">Vote</h3>
            <label className="form-control mb-3"><span className="label-text">Proposal ID</span>
              <input className="input input-bordered" value={proposalId} onChange={e=>setProposalId(e.target.value)}/></label>
            <label className="form-control mb-4"><span className="label-text">Support</span>
              <select className="select select-bordered" value={support} onChange={e=>setSupport(Number(e.target.value))}>
                <option value={0}>Against</option><option value={1}>For</option><option value={2}>Abstain</option>
              </select></label>
            <button className="btn btn-primary" disabled={isPending||isMining} onClick={onVote}>Cast Vote</button>
          </div>

          {writeErr && <div className="alert alert-error md:col-span-2"><span className="font-mono">{(writeErr as any)?.shortMessage ?? writeErr.message}</span></div>}
          {txHash &&   <div className="alert alert-info md:col-span-2"><span className="font-mono">tx: {txHash}</span></div>}
          {isMined &&  <div className="alert alert-success md:col-span-2"><span>✅ Transaction included</span></div>}
        </div>
      )}
    </div>
  );
}
