"use client";

import { useState } from "react";
import Link from "next/link";
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
    name: "castVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "proposalId" },
      { type: "uint8", name: "support" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const useAddr = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return (deployedContracts as any)?.[chainId]?.DisputeResolutionBoard?.address as `0x${string}` | undefined;
};

export default function DisputeBoardPage() {
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

  // Vote
  const [proposalId, setProposalId] = useState<string>("");
  const [support, setSupport] = useState<number>(1);
  const onVote = () => {
    if (!gov) return;
    writeContract({
      address: gov,
      abi: GOV_ABI,
      functionName: "castVote",
      args: [BigInt(proposalId), support],
    });
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/committees" className="link link-hover mb-4 inline-block">
            ← Back to Committees
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-bold">Dispute Resolution Board</h1>
            <div className="badge badge-secondary badge-lg">Simple Majority</div>
          </div>
          <p className="text-lg opacity-80 mb-2">Fair and transparent conflict resolution through voting</p>
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
            <span>Dispute Resolution Board contract is not deployed on this chain.</span>
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
                  className="w-8 h-8 text-secondary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
                  />
                </svg>
                How Simple Majority Voting Works
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-primary badge-lg">1</div>
                    <h3 className="font-semibold">Submit Dispute</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    Board members can submit dispute proposals for resolution. Each proposal outlines the issue,
                    evidence, and proposed resolution actions.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-secondary badge-lg">2</div>
                    <h3 className="font-semibold">Deliberation & Vote</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    During the voting period (~1 week), board members review evidence and cast votes:{" "}
                    <strong>For</strong>, <strong>Against</strong>, or <strong>Abstain</strong>.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-accent badge-lg">3</div>
                    <h3 className="font-semibold">Quorum & Threshold</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    The dispute must meet minimum quorum requirements. Simple majority rule applies: more
                    &quot;For&quot; than &quot;Against&quot; votes means the resolution passes.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-success badge-lg">4</div>
                    <h3 className="font-semibold">Resolution</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    If approved, the resolution is executed on-chain. All decisions are permanently recorded for
                    transparency and accountability.
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
                  <div className="font-semibold mb-1">Independent & Impartial</div>
                  <div>
                    The Dispute Resolution Board provides an independent forum for resolving conflicts fairly through
                    democratic voting. All proceedings are transparent and verifiable on-chain, ensuring trust and
                    legitimacy in the resolution process.
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  Submit Dispute
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Bring a dispute to the board for resolution. Provide detailed information, evidence, and proposed
                  remediation.
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
                    <span className="label-text-alt opacity-60">Contract affected by the dispute</span>
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
                    <span className="label-text-alt opacity-60">Proposed resolution action</span>
                  </div>
                </label>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Dispute Description</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Describe the dispute, parties involved, evidence, and proposed resolution..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">Be thorough and objective in your description</span>
                  </div>
                </label>

                <button
                  className="btn btn-primary w-full"
                  disabled={isPending || isMining || !target || !desc}
                  onClick={onPropose}
                >
                  {isPending || isMining ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    "Submit Dispute"
                  )}
                </button>
              </div>
            </div>

            {/* Vote */}
            <div className="card bg-base-100 shadow-xl border border-secondary/20">
              <div className="card-body">
                <h3 className="card-title text-xl mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-secondary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002"
                    />
                  </svg>
                  Vote on Resolution
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Review dispute details and cast your vote. Consider all evidence and perspectives before deciding.
                </p>

                <label className="form-control mb-3">
                  <div className="label">
                    <span className="label-text font-semibold">Dispute Proposal ID</span>
                  </div>
                  <input
                    className="input input-bordered font-mono"
                    placeholder="Enter proposal ID..."
                    value={proposalId}
                    onChange={e => setProposalId(e.target.value)}
                    type="number"
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">ID from the dispute submission transaction</span>
                  </div>
                </label>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Your Decision</span>
                  </div>
                  <div className="join join-vertical w-full">
                    <button
                      className={`btn join-item ${support === 1 ? "btn-success" : "btn-outline"}`}
                      onClick={() => setSupport(1)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      For (Approve Resolution)
                    </button>
                    <button
                      className={`btn join-item ${support === 0 ? "btn-error" : "btn-outline"}`}
                      onClick={() => setSupport(0)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Against (Reject Resolution)
                    </button>
                    <button
                      className={`btn join-item ${support === 2 ? "btn-neutral" : "btn-outline"}`}
                      onClick={() => setSupport(2)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      Abstain (No Position)
                    </button>
                  </div>
                  <div className="label">
                    <span className="label-text-alt opacity-60">Vote fairly based on evidence</span>
                  </div>
                </label>

                <button
                  className="btn btn-secondary w-full"
                  disabled={isPending || isMining || !proposalId}
                  onClick={onVote}
                >
                  {isPending || isMining ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Submitting Vote...
                    </>
                  ) : (
                    "Cast Vote"
                  )}
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
              <span>
                <div className="font-semibold">Transaction Failed</div>
                <div className="font-mono text-xs opacity-80">
                  {(writeErr as any)?.shortMessage ?? writeErr.message}
                </div>
              </span>
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
