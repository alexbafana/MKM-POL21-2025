"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { SubmittedRDFList } from "~~/components/dao/SubmittedRDFList";
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

const MKMP_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint32" }],
  },
  {
    type: "function",
    name: "has_permission",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "_permissionIndex", type: "uint64" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "onboard_data_validator",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const useAddr = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return (deployedContracts as any)?.[chainId]?.ValidationCommittee?.address as `0x${string}` | undefined;
};

const useMkmpAddr = (): `0x${string}` | undefined => {
  const chainId = useChainId();
  return (deployedContracts as any)?.[chainId]?.MKMPOL21?.address as `0x${string}` | undefined;
};

export default function ValidationCommitteePage() {
  const chainId = useChainId();
  const gov = useAddr();
  const mkmpAddr = useMkmpAddr();
  const { address } = useAccount();

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  // Onboard Data Validator write hook
  const {
    writeContract: onboardValidator,
    data: onboardTxHash,
    error: onboardErr,
    isPending: isOnboarding,
  } = useWriteContract();
  const { isLoading: isOnboardMining, isSuccess: isOnboardMined } = useWaitForTransactionReceipt({
    hash: onboardTxHash,
  });

  // Check user role for voting permissions
  const { data: roleRaw } = useReadContract({
    abi: MKMP_ABI,
    address: mkmpAddr,
    functionName: "hasRole",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address && mkmpAddr) },
  });

  // On-chain permission check: bit 31 = vote on Validation Committee
  const { data: canVotePermission } = useReadContract({
    abi: MKMP_ABI,
    address: mkmpAddr,
    functionName: "has_permission",
    args: [address ?? zeroAddress, 31n],
    query: { enabled: Boolean(address && mkmpAddr) },
  });

  const { roleIndex, canVote, isEligibleForValidator } = useMemo(() => {
    const v = roleRaw ? Number(roleRaw) : 0;
    const idx = v & 31;
    return {
      roleIndex: idx,
      canVote: !!canVotePermission,
      // Member_Institution (0) or Ordinary_User (1) can upgrade to Data_Validator
      isEligibleForValidator: v !== 0 && (idx === 0 || idx === 1),
    };
  }, [roleRaw, canVotePermission]);

  // Advanced section toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  // Vote (advanced)
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
            &larr; Back to Committees
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-bold">Validation Committee</h1>
            <div className="badge badge-info badge-lg">Simple Majority</div>
          </div>
          <p className="text-lg opacity-80 mb-2">Review and vote on submitted RDF graphs for DKG publication</p>
          <div className="text-sm opacity-60">
            Chain {chainId} &bull; Contract {gov ? <Address address={gov} /> : "not deployed"}
            {address && (
              <span className="ml-3">
                &bull; Role: {roleIndex} {canVote ? "(can vote)" : "(view only)"}
              </span>
            )}
          </div>
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
          {/* Become Data Validator Banner */}
          {isEligibleForValidator && (
            <div className="card bg-gradient-to-r from-warning/10 to-info/10 border border-warning/30 shadow-lg mb-8">
              <div className="card-body">
                <h3 className="card-title text-lg">You are a DAO member but not a Data Validator</h3>
                <p className="text-sm opacity-80">
                  Data Validators can propose and vote on RDF graph approvals in the Validation Committee. Upgrade your
                  role to participate in governance.
                </p>
                <div className="card-actions mt-2">
                  <button
                    className="btn btn-warning"
                    disabled={isOnboarding || isOnboardMining}
                    onClick={() => {
                      if (!mkmpAddr) return;
                      onboardValidator({
                        address: mkmpAddr,
                        abi: MKMP_ABI,
                        functionName: "onboard_data_validator",
                      });
                    }}
                  >
                    {isOnboarding || isOnboardMining ? (
                      <>
                        <span className="loading loading-spinner"></span> Processing...
                      </>
                    ) : (
                      "Become Data Validator"
                    )}
                  </button>
                </div>
                {onboardErr && (
                  <div className="text-error text-sm mt-2 font-mono">
                    {(onboardErr as any)?.shortMessage ?? onboardErr.message}
                  </div>
                )}
                {isOnboardMined && (
                  <div className="text-success text-sm mt-2 font-semibold">
                    Role upgraded! You are now a Data Validator. Refresh the page to see your updated permissions.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RDF Submissions for Review */}
          <div className="card bg-base-100 shadow-xl border border-base-300 mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                RDF Submissions for Review
              </h2>
              <p className="text-sm text-base-content/70 mb-4">
                All submitted RDF graphs and their governance proposal status.{" "}
                {canVote ? "You can vote on active proposals." : "Connect with a Validation Committee role to vote."}
              </p>

              <SubmittedRDFList canVote={canVote} />
            </div>
          </div>

          {/* How it works */}
          <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-info"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
                How RDF Validation Works
              </h2>

              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-primary">1</div>
                    <h3 className="font-semibold text-sm">Submit</h3>
                  </div>
                  <p className="text-xs opacity-70">
                    Member uploads TTL file, runs verification, and submits to blockchain. A governance proposal is
                    auto-created.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-secondary">2</div>
                    <h3 className="font-semibold text-sm">Vote</h3>
                  </div>
                  <p className="text-xs opacity-70">
                    Validation Committee members review the RDF data and vote For, Against, or Abstain on the proposal.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-accent">3</div>
                    <h3 className="font-semibold text-sm">Execute</h3>
                  </div>
                  <p className="text-xs opacity-70">
                    After voting passes, anyone can execute the proposal to mark the RDF graph as committee-approved.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-success">4</div>
                    <h3 className="font-semibold text-sm">Publish</h3>
                  </div>
                  <p className="text-xs opacity-70">
                    Approved graphs become eligible for publication to the OriginTrail Decentralized Knowledge Graph.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced: Manual Propose/Vote (collapsed) */}
          <div className="collapse collapse-arrow bg-base-100 shadow-xl border border-base-300">
            <input type="checkbox" checked={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)} />
            <div className="collapse-title text-lg font-medium">Advanced: Manual Proposal & Vote</div>
            <div className="collapse-content">
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {/* Propose */}
                <div className="card bg-base-200 border border-primary/20">
                  <div className="card-body">
                    <h3 className="card-title text-lg mb-3">Create Proposal</h3>
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
                    </label>
                    <label className="form-control mb-4">
                      <div className="label">
                        <span className="label-text font-semibold">Description</span>
                      </div>
                      <textarea
                        className="textarea textarea-bordered h-24"
                        placeholder="Describe your proposal..."
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                      />
                    </label>
                    <button
                      className="btn btn-primary w-full"
                      disabled={isPending || isMining || !target || !desc}
                      onClick={onPropose}
                    >
                      {isPending || isMining ? (
                        <>
                          <span className="loading loading-spinner"></span> Processing...
                        </>
                      ) : (
                        "Submit Proposal"
                      )}
                    </button>
                  </div>
                </div>

                {/* Vote */}
                <div className="card bg-base-200 border border-secondary/20">
                  <div className="card-body">
                    <h3 className="card-title text-lg mb-3">Cast Vote (by ID)</h3>
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
                    </label>
                    <label className="form-control mb-4">
                      <div className="label">
                        <span className="label-text font-semibold">Your Vote</span>
                      </div>
                      <div className="join join-horizontal w-full">
                        <button
                          className={`btn join-item flex-1 ${support === 1 ? "btn-success" : "btn-outline"}`}
                          onClick={() => setSupport(1)}
                        >
                          For
                        </button>
                        <button
                          className={`btn join-item flex-1 ${support === 0 ? "btn-error" : "btn-outline"}`}
                          onClick={() => setSupport(0)}
                        >
                          Against
                        </button>
                        <button
                          className={`btn join-item flex-1 ${support === 2 ? "btn-neutral" : "btn-outline"}`}
                          onClick={() => setSupport(2)}
                        >
                          Abstain
                        </button>
                      </div>
                    </label>
                    <button
                      className="btn btn-secondary w-full"
                      disabled={isPending || isMining || !proposalId}
                      onClick={onVote}
                    >
                      {isPending || isMining ? (
                        <>
                          <span className="loading loading-spinner"></span> Submitting Vote...
                        </>
                      ) : (
                        "Cast Vote"
                      )}
                    </button>
                  </div>
                </div>
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
