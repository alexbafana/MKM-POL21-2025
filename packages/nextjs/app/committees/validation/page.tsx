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
  return (deployedContracts as any)?.[chainId]?.ValidationCommittee?.address as `0x${string}` | undefined;
};

export default function ValidationCommitteePage() {
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
      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/committees" className="link link-hover mb-4 inline-block">
            ← Back to Committees
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-bold">Validation Committee</h1>
            <div className="badge badge-info badge-lg">Simple Majority</div>
          </div>
          <p className="text-lg opacity-80 mb-2">Democratic decision-making through transparent voting</p>
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
            <span>Validation Committee contract is not deployed on this chain.</span>
          </div>
        </div>
      )}

      {gov && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Quick Access to RDF Review */}
          <div className="alert bg-accent/10 border border-accent/20 mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-accent shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <div>
              <h3 className="font-bold">RDF Graph Review System</h3>
              <div className="text-sm">Review and approve submitted RDF graphs for DKG publication</div>
            </div>
            <Link href="/committees/validation/rdf-review" className="btn btn-accent btn-sm">
              Review RDF Graphs →
            </Link>
          </div>

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
                  className="w-8 h-8 text-info"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
                How Simple Majority Voting Works
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-primary badge-lg">1</div>
                    <h3 className="font-semibold">Create Proposal</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    Members with proposal rights submit proposals for committee consideration. Each proposal includes a
                    clear description and on-chain actions to execute if approved.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-secondary badge-lg">2</div>
                    <h3 className="font-semibold">Vote</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    During the voting period (~1 week), authorized members cast their votes: <strong>For</strong>,{" "}
                    <strong>Against</strong>, or <strong>Abstain</strong>. Voting power is determined by token holdings.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-accent badge-lg">3</div>
                    <h3 className="font-semibold">Quorum Check</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    The proposal must meet the minimum quorum requirement for the vote to be valid. This ensures
                    sufficient participation from the committee.
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-success badge-lg">4</div>
                    <h3 className="font-semibold">Execute</h3>
                  </div>
                  <p className="text-sm opacity-70">
                    If the proposal receives more &quot;For&quot; votes than &quot;Against&quot; votes and meets quorum,
                    it passes automatically and can be executed on-chain.
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
                  <div className="font-semibold mb-1">Democratic & Transparent</div>
                  <div>
                    Simple majority governance is the traditional democratic approach where proposals pass if they
                    receive more support than opposition. Every vote is recorded on-chain, ensuring complete
                    transparency and accountability.
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
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  Create Proposal
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Submit a proposal for committee vote. Ensure your proposal is well-documented and includes clear
                  execution steps.
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
                    <span className="label-text-alt opacity-60">Contract address to interact with</span>
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
                    <span className="label-text-alt opacity-60">Encoded function call data</span>
                  </div>
                </label>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Description</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Describe your proposal in detail..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">Be clear about objectives and expected outcomes</span>
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
                    "Submit Proposal"
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
                  Cast Your Vote
                </h3>
                <p className="text-sm opacity-70 mb-4">
                  Participate in active proposals by voting. Your vote counts based on your voting power (token
                  balance).
                </p>

                <label className="form-control mb-3">
                  <div className="label">
                    <span className="label-text font-semibold">Proposal ID</span>
                  </div>
                  <input
                    className="input input-bordered font-mono"
                    placeholder="Enter proposal ID..."
                    value={proposalId}
                    onChange={e => setProposalId(e.target.value)}
                    type="number"
                  />
                  <div className="label">
                    <span className="label-text-alt opacity-60">Found in the proposal creation transaction</span>
                  </div>
                </label>

                <label className="form-control mb-4">
                  <div className="label">
                    <span className="label-text font-semibold">Your Vote</span>
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
                          d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                        />
                      </svg>
                      For (Support)
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
                          d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384"
                        />
                      </svg>
                      Against (Oppose)
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
                      Abstain (Neutral)
                    </button>
                  </div>
                  <div className="label">
                    <span className="label-text-alt opacity-60">Select your position carefully</span>
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
