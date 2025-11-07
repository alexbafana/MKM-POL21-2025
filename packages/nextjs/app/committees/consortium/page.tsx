"use client";

import { useState } from "react";
import Link from "next/link";
import { keccak256 } from "viem";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";

const GOV_ABI = [
  {
    name: "propose",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address[]", name: "targets" },
      { type: "uint256[]", name: "values" },
      { type: "bytes[]", name: "calldatas" },
      { type: "string", name: "description" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "vetoProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "proposalId" }],
    outputs: [],
  },
  {
    name: "executeProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address[]", name: "targets" },
      { type: "uint256[]", name: "values" },
      { type: "bytes[]", name: "calldatas" },
      { type: "bytes32", name: "descriptionHash" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "challengePeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const useAddr = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return (deployedContracts as any)?.[chainId]?.Consortium?.address as `0x${string}` | undefined;
};

export default function ConsortiumPage() {
  const chainId = useChainId();
  const gov = useAddr();

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  // Propose
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [calldataHex, setCalldataHex] = useState("0x");
  const onPropose = () => {
    if (!gov) return;
    try {
      writeContract({
        address: gov,
        abi: GOV_ABI,
        functionName: "propose",
        args: [[target as `0x${string}`], [0n], [calldataHex as `0x${string}`], desc],
      });
    } catch {}
  };

  // Veto
  const [vetoProposalId, setVetoProposalId] = useState<string>("");
  const onVeto = () => {
    if (!gov) return;
    writeContract({
      address: gov,
      abi: GOV_ABI,
      functionName: "vetoProposal",
      args: [BigInt(vetoProposalId)],
    });
  };

  // Execute
  const [execTarget, setExecTarget] = useState("");
  const [execCalldata, setExecCalldata] = useState("0x");
  const [execDesc, setExecDesc] = useState("");
  const onExecute = () => {
    if (!gov) return;
    try {
      const descriptionHash = keccak256(Buffer.from(execDesc));
      writeContract({
        address: gov,
        abi: GOV_ABI,
        functionName: "executeProposal",
        args: [[execTarget as `0x${string}`], [0n], [execCalldata as `0x${string}`], descriptionHash],
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-warning/20 to-orange-500/20 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/committees" className="link link-hover mb-4 inline-block">
            ← Back to Committees
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-bold">Consortium</h1>
            <div className="badge badge-warning badge-lg">Optimistic Governance</div>
          </div>
          <p className="text-lg opacity-80 mb-2">Trust-minimized governance with built-in challenge periods</p>
          <p className="text-sm opacity-60">
            Chain {chainId} • Contract {gov ? <Address address={gov} /> : "not deployed"}
          </p>
        </div>
      </div>

      {!gov && (
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Consortium contract is not deployed on this chain.</span>
          </div>
        </div>
      )}

      {gov && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Protocol Explanation */}
          <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-warning"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                How Optimistic Governance Works
              </h2>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-primary badge-lg">1</div>
                    <h3 className="font-semibold">Propose</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    Any authorized member submits a proposal with actions to execute. The proposal enters a challenge
                    period immediately.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-warning badge-lg">2</div>
                    <h3 className="font-semibold">Challenge Period</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    For 3 days (259,200 seconds), anyone can veto the proposal if they detect issues. No voting needed
                    unless challenged.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-success badge-lg">3</div>
                    <h3 className="font-semibold">Execute</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    If not vetoed, anyone can execute the proposal after the challenge period expires. Actions are
                    performed on-chain.
                  </p>
                </div>
              </div>

              <div className="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span className="text-sm">
                  <div className="font-semibold mb-1">Why Optimistic?</div>
                  <div>
                    This protocol assumes proposals are valid by default (&quot;optimistic&quot;). Only if someone
                    raises a concern (veto) does the proposal fail. This enables faster, more efficient governance
                    compared to traditional voting on every proposal.
                  </div>
                </span>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Propose */}
            <div className="card bg-base-100 shadow-xl border border-primary/20">
              <div className="card-body">
                <h3 className="card-title text-xl mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-primary"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Proposal
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Submit a new proposal to execute actions on-chain. Be clear and specific in your description.
                </p>

                <label className="form-control mb-3">
                  <div className="label">
                    <span className="label-text font-semibold">Target Contract</span>
                  </div>
                  <input
                    className="input input-bordered font-mono text-sm"
                    placeholder="0x..."
                    value={target}
                    onChange={e => setTarget(e.target.value.trim())}
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">Address of the contract to call</span>
                  </div>
                </label>

                <label className="form-control mb-3">
                  <div className="label">
                    <span className="label-text font-semibold">Calldata</span>
                  </div>
                  <input
                    className="input input-bordered font-mono text-sm"
                    placeholder="0x..."
                    value={calldataHex}
                    onChange={e => setCalldataHex(e.target.value.trim())}
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">Encoded function call</span>
                  </div>
                </label>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Description</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Explain what this proposal does and why..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                </label>

                <button
                  className="btn btn-primary w-full"
                  disabled={isPending || isMining || !target || !desc}
                  onClick={onPropose}
                >
                  {isPending || isMining ? <span className="loading loading-spinner"></span> : "Submit Proposal"}
                </button>
              </div>
            </div>

            {/* Veto */}
            <div className="card bg-base-100 shadow-xl border border-warning/40">
              <div className="card-body">
                <h3 className="card-title text-xl mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-warning"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  Veto Proposal
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Challenge a proposal during its 3-day period if you identify issues or concerns.
                </p>

                <div className="alert alert-warning mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-current shrink-0 w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-xs">
                    Use this power responsibly. Vetos should only be used for legitimate concerns.
                  </span>
                </div>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Proposal ID</span>
                  </div>
                  <input
                    className="input input-bordered font-mono"
                    placeholder="Enter proposal ID..."
                    value={vetoProposalId}
                    onChange={e => setVetoProposalId(e.target.value)}
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">The ID from the proposal transaction</span>
                  </div>
                </label>

                <button
                  className="btn btn-warning w-full"
                  disabled={isPending || isMining || !vetoProposalId}
                  onClick={onVeto}
                >
                  {isPending || isMining ? <span className="loading loading-spinner"></span> : "Veto Proposal"}
                </button>
              </div>
            </div>

            {/* Execute */}
            <div className="card bg-base-100 shadow-xl border border-success/40 md:col-span-2">
              <div className="card-body">
                <h3 className="card-title text-xl mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-success"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Execute Proposal
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Execute a proposal after the 3-day challenge period has passed without veto. You must provide the
                  exact same parameters as the original proposal.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  <label className="form-control">
                    <div className="label">
                      <span className="label-text font-semibold">Target Contract</span>
                    </div>
                    <input
                      className="input input-bordered font-mono text-sm"
                      placeholder="0x..."
                      value={execTarget}
                      onChange={e => setExecTarget(e.target.value.trim())}
                    />
                  </label>

                  <label className="form-control">
                    <div className="label">
                      <span className="label-text font-semibold">Calldata</span>
                    </div>
                    <input
                      className="input input-bordered font-mono text-sm"
                      placeholder="0x..."
                      value={execCalldata}
                      onChange={e => setExecCalldata(e.target.value.trim())}
                    />
                  </label>

                  <label className="form-control">
                    <div className="label">
                      <span className="label-text font-semibold">Description (exact match)</span>
                    </div>
                    <input
                      className="input input-bordered text-sm"
                      placeholder="Must match exactly..."
                      value={execDesc}
                      onChange={e => setExecDesc(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="btn btn-success w-full mt-4"
                  disabled={isPending || isMining || !execTarget || !execDesc}
                  onClick={onExecute}
                >
                  {isPending || isMining ? <span className="loading loading-spinner"></span> : "Execute Proposal"}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction Status */}
          {writeErr && (
            <div className="alert alert-error mt-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-mono text-sm">{(writeErr as any)?.shortMessage ?? writeErr.message}</span>
            </div>
          )}
          {txHash && (
            <div className="alert alert-info mt-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>
                <div className="font-semibold">Transaction Submitted</div>
                <div className="font-mono text-xs opacity-80">{txHash}</div>
              </span>
            </div>
          )}
          {isMined && (
            <div className="alert alert-success mt-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Transaction confirmed successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
