"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleIcon, SpinnerIcon } from "./Icons";
import { formatEther, keccak256, toBytes } from "viem";
import { useAccount, useChainId, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useRDFProposals } from "~~/hooks/useRDFProposals";
import type { RDFProposal } from "~~/hooks/useRDFProposals";

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_LABELS = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

const GA_DATA_VALIDATION_ABI = [
  {
    type: "function",
    name: "getRDFGraphBasicInfo",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "graphHash", type: "bytes32" },
      { name: "graphURI", type: "string" },
      { name: "graphType", type: "uint8" },
      { name: "datasetVariant", type: "uint8" },
      { name: "year", type: "uint256" },
      { name: "version", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getGraphStatus",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "validated", type: "bool" },
      { name: "approved", type: "bool" },
      { name: "published", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getValidationDetails",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "syntaxValid", type: "bool" },
      { name: "semanticValid", type: "bool" },
      { name: "overallValid", type: "bool" },
      { name: "validationErrors", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getRDFGraphMetadata",
    stateMutability: "view",
    inputs: [{ name: "graphId", type: "bytes32" }],
    outputs: [
      { name: "submitter", type: "address" },
      { name: "submittedAt", type: "uint256" },
      { name: "modelVersion", type: "string" },
      { name: "dkgAssetUAL", type: "string" },
    ],
  },
] as const;

const GOV_ABI = [
  {
    type: "function",
    name: "castVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

interface GraphDetails {
  graphId: string;
  graphURI: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  version: number;
  submitter: string;
  submittedAt: number;
  modelVersion: string;
  exists: boolean;
  validated: boolean;
  approved: boolean;
  published: boolean;
  syntaxValid: boolean;
  semanticValid: boolean;
  overallValid: boolean;
  validationErrors: string;
}

interface SubmittedRDFListProps {
  canVote: boolean;
}

export function SubmittedRDFList({ canVote }: SubmittedRDFListProps) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { proposals, refetch: refetchProposals } = useRDFProposals();
  const [graphDetails, setGraphDetails] = useState<Map<string, GraphDetails>>(new Map());
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [votedProposals, setVotedProposals] = useState<Set<string>>(new Set());
  const [voteError, setVoteError] = useState<string | null>(null);

  // Track which graphIds we've already fetched to avoid refetching on every render
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  // Track which txHash we've already handled to avoid infinite refetch loop
  const handledTxRef = useRef<string | undefined>(undefined);

  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  const committeeAddress = (deployedContracts as any)?.[chainId]?.ValidationCommittee?.address as
    | `0x${string}`
    | undefined;
  const gaAddress = (deployedContracts as any)?.[chainId]?.GADataValidation?.address as `0x${string}` | undefined;

  // Check hasVoted for each active proposal
  useEffect(() => {
    if (!publicClient || !committeeAddress || !address || proposals.size === 0) return;
    let cancelled = false;

    async function checkVoted() {
      const voted = new Set<string>();
      for (const [, proposal] of proposals) {
        if (proposal.state !== "Active") continue;
        try {
          const result = await publicClient!.readContract({
            address: committeeAddress!,
            abi: GOV_ABI,
            functionName: "hasVoted",
            args: [proposal.proposalId, address!],
          });
          if (result) voted.add(proposal.proposalId.toString());
        } catch {}
      }
      if (!cancelled) setVotedProposals(voted);
    }

    checkVoted();
    return () => {
      cancelled = true;
    };
  }, [publicClient, committeeAddress, address, proposals]);

  // Display write errors
  useEffect(() => {
    if (writeError) {
      const msg = (writeError as any)?.shortMessage || writeError.message;
      setVoteError(msg);
      setVotingProposalId(null);
    }
  }, [writeError]);

  // Fetch submitted RDF graphs — no watch to prevent constant re-renders
  const { data: submittedEvents } = useScaffoldEventHistory({
    contractName: "GADataValidation",
    eventName: "RDFGraphSubmitted",
    watch: false,
    fromBlock: 0n,
  });

  // Extract stable list of graph IDs from events
  const graphIds = submittedEvents?.map(e => e.args?.graphId as string).filter(Boolean) || [];
  const graphIdsKey = graphIds.join(",");

  // Fetch graph details only for NEW graphs we haven't seen before
  useEffect(() => {
    if (!publicClient || !gaAddress || graphIds.length === 0) {
      if (!hasFetchedOnce && graphIds.length === 0 && submittedEvents !== undefined) {
        setIsLoadingGraphs(false);
        setHasFetchedOnce(true);
      }
      return;
    }

    // Find only new graph IDs we haven't fetched yet
    const newIds = graphIds.filter(id => !fetchedIdsRef.current.has(id));

    // If we've fetched everything already, just mark loading done
    if (newIds.length === 0) {
      setIsLoadingGraphs(false);
      setHasFetchedOnce(true);
      return;
    }

    let cancelled = false;

    async function fetchNewDetails() {
      // Only show loading spinner on first load, not incremental updates
      if (!hasFetchedOnce) {
        setIsLoadingGraphs(true);
      }

      for (const graphId of newIds) {
        if (cancelled) return;

        try {
          const [basicInfo, status, validation, metadata] = await Promise.all([
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphBasicInfo",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getGraphStatus",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getValidationDetails",
              args: [graphId as `0x${string}`],
            }),
            publicClient!.readContract({
              address: gaAddress!,
              abi: GA_DATA_VALIDATION_ABI,
              functionName: "getRDFGraphMetadata",
              args: [graphId as `0x${string}`],
            }),
          ]);

          if (cancelled) return;

          const detail: GraphDetails = {
            graphId,
            graphURI: (basicInfo as any)[1],
            graphType: Number((basicInfo as any)[2]),
            datasetVariant: Number((basicInfo as any)[3]),
            year: Number((basicInfo as any)[4]),
            version: Number((basicInfo as any)[5]),
            submitter: (metadata as any)[0],
            submittedAt: Number((metadata as any)[1]),
            modelVersion: (metadata as any)[2],
            exists: (status as any)[0],
            validated: (status as any)[1],
            approved: (status as any)[2],
            published: (status as any)[3],
            syntaxValid: (validation as any)[0],
            semanticValid: (validation as any)[1],
            overallValid: (validation as any)[2],
            validationErrors: (validation as any)[3],
          };

          fetchedIdsRef.current.add(graphId);
          setGraphDetails(prev => {
            const next = new Map(prev);
            next.set(graphId, detail);
            return next;
          });
        } catch (err) {
          console.warn(`Failed to fetch details for graph ${graphId}:`, err);
          // Mark as fetched to avoid retrying on every render
          fetchedIdsRef.current.add(graphId);
        }
      }

      if (!cancelled) {
        setIsLoadingGraphs(false);
        setHasFetchedOnce(true);
      }
    }

    fetchNewDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, gaAddress, graphIdsKey]);

  // Refresh proposals after voting — only once per transaction
  useEffect(() => {
    if (isMined && txHash && handledTxRef.current !== txHash) {
      handledTxRef.current = txHash;
      // Mark the voted proposal in local state immediately
      if (votingProposalId) {
        setVotedProposals(prev => new Set(prev).add(votingProposalId));
      }
      refetchProposals();
      setVotingProposalId(null);
      setVoteError(null);
    }
  }, [isMined, txHash, refetchProposals, votingProposalId]);

  const handleVote = useCallback(
    (proposalId: bigint, support: number) => {
      if (!committeeAddress) return;
      setVoteError(null);
      resetWrite();
      setVotingProposalId(proposalId.toString());
      writeContract({
        address: committeeAddress,
        abi: GOV_ABI,
        functionName: "castVote",
        args: [proposalId, support],
      });
    },
    [committeeAddress, writeContract, resetWrite],
  );

  const handleExecute = useCallback(
    (proposal: RDFProposal) => {
      if (!committeeAddress || !gaAddress) return;

      const graphId = proposal.graphId as `0x${string}`;
      const selector = keccak256(toBytes("approveRDFGraph(bytes32)")).slice(0, 10);
      const calldata = (selector + graphId.slice(2).padStart(64, "0")) as `0x${string}`;
      const descriptionHash = keccak256(toBytes(proposal.description));

      writeContract({
        address: committeeAddress,
        abi: GOV_ABI,
        functionName: "execute",
        args: [[gaAddress], [0n], [calldata], descriptionHash],
      });
    },
    [committeeAddress, gaAddress, writeContract],
  );

  // Show loading only on initial load
  if (isLoadingGraphs && !hasFetchedOnce) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerIcon className="w-8 h-8 text-primary" />
        <span className="ml-3 text-base-content/70">Loading submitted RDF graphs...</span>
      </div>
    );
  }

  if (graphIds.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-16 h-16 mx-auto mb-4 text-base-content/20"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-base-content/60">No RDF graphs submitted yet</p>
        <p className="text-sm text-base-content/40 mt-2">
          Submit an RDF graph from the Data Provision page to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {graphIds.map(graphId => {
        const details = graphDetails.get(graphId);
        const proposal = proposals.get(graphId);

        return (
          <div key={graphId} className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-4">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">
                    {details ? GRAPH_TYPE_LABELS[details.graphType] || "Unknown" : "Loading..."} Graph
                  </h4>
                  <div className="font-mono text-xs text-base-content/50 mt-0.5">
                    {graphId.slice(0, 10)}...{graphId.slice(-8)}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5">
                  {details?.validated && (
                    <div className={`badge badge-sm ${details.overallValid ? "badge-success" : "badge-error"}`}>
                      {details.overallValid ? "Validated" : "Invalid"}
                    </div>
                  )}
                  {details?.approved && <div className="badge badge-sm badge-accent">Approved</div>}
                  {details?.published && <div className="badge badge-sm badge-info">Published</div>}
                  {proposal && (
                    <div
                      className={`badge badge-sm ${
                        proposal.state === "Active"
                          ? "badge-primary"
                          : proposal.state === "Succeeded"
                            ? "badge-success"
                            : proposal.state === "Executed"
                              ? "badge-accent"
                              : proposal.state === "Defeated"
                                ? "badge-error"
                                : "badge-ghost"
                      }`}
                    >
                      Proposal: {proposal.state}
                    </div>
                  )}
                  {!proposal && details?.exists && <div className="badge badge-sm badge-ghost">No proposal yet</div>}
                </div>
              </div>

              {/* Details grid */}
              {details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-base-content/50">URI:</span>{" "}
                    <span className="font-mono">{details.graphURI}</span>
                  </div>
                  <div>
                    <span className="text-base-content/50">Dataset:</span>{" "}
                    <span>{DATASET_LABELS[details.datasetVariant] || "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-base-content/50">Year:</span> <span>{details.year}</span>
                  </div>
                  <div>
                    <span className="text-base-content/50">Version:</span> <span>{details.version}</span>
                  </div>
                </div>
              )}

              {/* Validation badges */}
              {details?.validated && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <div className={`badge badge-xs ${details.syntaxValid ? "badge-success" : "badge-error"}`}>
                    Syntax: {details.syntaxValid ? "Pass" : "Fail"}
                  </div>
                  <div className={`badge badge-xs ${details.semanticValid ? "badge-success" : "badge-warning"}`}>
                    Semantic: {details.semanticValid ? "Pass" : "Warnings"}
                  </div>
                  {details.validationErrors && <span className="text-xs text-error">{details.validationErrors}</span>}
                </div>
              )}

              {/* Committee review status info */}
              {proposal && (
                <div className="mt-3 pt-3 border-t border-base-300">
                  {/* Info banner for pending/active proposals */}
                  {(proposal.state === "Pending" || proposal.state === "Active") && (
                    <div className="flex items-center gap-2 text-xs text-info mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 shrink-0"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                        />
                      </svg>
                      <span>
                        This RDF file has been sent for committee review.
                        {proposal.state === "Active" && " Voting is currently open."}
                        {proposal.state === "Pending" && " Voting has not started yet."}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Vote tally */}
                    <div className="flex gap-3 text-xs">
                      <span className="text-success font-semibold">For: {formatEther(proposal.votes.forVotes)}</span>
                      <span className="text-error font-semibold">
                        Against: {formatEther(proposal.votes.againstVotes)}
                      </span>
                      <span className="text-base-content/60">Abstain: {formatEther(proposal.votes.abstainVotes)}</span>
                    </div>

                    {/* Voting buttons or already-voted indicator */}
                    {canVote &&
                      proposal.state === "Active" &&
                      (votedProposals.has(proposal.proposalId.toString()) ? (
                        <div className="flex items-center gap-1 ml-auto text-xs text-success">
                          <CheckCircleIcon className="w-3 h-3" />
                          Vote cast
                        </div>
                      ) : (
                        <div className="flex gap-1.5 ml-auto">
                          <button
                            className="btn btn-xs btn-success"
                            disabled={isPending || isMining}
                            onClick={() => handleVote(proposal.proposalId, 1)}
                          >
                            {votingProposalId === proposal.proposalId.toString() && (isPending || isMining) ? (
                              <SpinnerIcon className="w-3 h-3" />
                            ) : (
                              "For"
                            )}
                          </button>
                          <button
                            className="btn btn-xs btn-error"
                            disabled={isPending || isMining}
                            onClick={() => handleVote(proposal.proposalId, 0)}
                          >
                            Against
                          </button>
                          <button
                            className="btn btn-xs btn-ghost"
                            disabled={isPending || isMining}
                            onClick={() => handleVote(proposal.proposalId, 2)}
                          >
                            Abstain
                          </button>
                        </div>
                      ))}

                    {/* Execute button */}
                    {proposal.state === "Succeeded" && (
                      <button
                        className="btn btn-xs btn-accent ml-auto gap-1"
                        disabled={isPending || isMining}
                        onClick={() => handleExecute(proposal)}
                      >
                        {isPending || isMining ? (
                          <SpinnerIcon className="w-3 h-3" />
                        ) : (
                          <CheckCircleIcon className="w-3 h-3" />
                        )}
                        Execute
                      </button>
                    )}
                  </div>

                  {/* Outcome banner — Executed (approved) */}
                  {proposal.state === "Executed" && (
                    <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircleIcon className="w-4 h-4 text-success" />
                        <span className="font-semibold text-sm text-success">Validation Approved</span>
                      </div>
                      <p className="text-xs text-base-content/70">
                        The Validation Committee has approved this RDF graph.
                        {details?.published
                          ? " It has been published to the OriginTrail Decentralized Knowledge Graph."
                          : " It is now eligible for publication to the OriginTrail Decentralized Knowledge Graph (DKG)."}
                      </p>
                    </div>
                  )}

                  {/* Outcome banner — Defeated */}
                  {proposal.state === "Defeated" && (
                    <div className="mt-3 p-3 rounded-lg bg-error/10 border border-error/20">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 text-error"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        <span className="font-semibold text-sm text-error">Validation Rejected</span>
                      </div>
                      <p className="text-xs text-base-content/70">
                        The Validation Committee has rejected this RDF graph. The data provider may revise and resubmit.
                      </p>
                    </div>
                  )}

                  {/* Outcome banner — Succeeded (awaiting execution) */}
                  {proposal.state === "Succeeded" && (
                    <div className="mt-3 p-3 rounded-lg bg-info/10 border border-info/20">
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 text-info shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                          />
                        </svg>
                        <p className="text-xs text-base-content/70">
                          Voting passed. Click <strong>Execute</strong> to finalize the approval on-chain.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Vote error display */}
      {voteError && (
        <div className="alert alert-error mt-4 text-sm">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-semibold">Vote failed</div>
            <div className="text-xs opacity-80">{voteError}</div>
          </div>
          <button className="btn btn-xs btn-ghost" onClick={() => setVoteError(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
