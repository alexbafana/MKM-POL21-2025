"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChainId, usePublicClient } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";

/** ABI fragments for reading proposal data */
const VALIDATION_COMMITTEE_ABI = [
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "proposer", type: "address", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "signatures", type: "string[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "proposalVotes",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
] as const;

/** Proposal states from OpenZeppelin Governor */
export const PROPOSAL_STATES = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;

export type ProposalState = (typeof PROPOSAL_STATES)[number];

export interface RDFProposal {
  proposalId: bigint;
  graphId: string;
  description: string;
  proposer: string;
  voteStart: bigint;
  voteEnd: bigint;
  state: ProposalState;
  stateIndex: number;
  votes: {
    forVotes: bigint;
    againstVotes: bigint;
    abstainVotes: bigint;
  };
}

/**
 * Extract graphId from proposal description using [RDF-APPROVAL] marker.
 * Looks for "Graph ID: 0x..." pattern.
 */
function extractGraphId(description: string): string | null {
  if (!description.includes("[RDF-APPROVAL]")) return null;
  const match = description.match(/Graph ID:\s*(0x[a-fA-F0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Hook to query RDF approval proposals from the Validation Committee.
 * Returns a map of graphId -> RDFProposal for correlation with submitted RDF data.
 */
export function useRDFProposals(): {
  proposals: Map<string, RDFProposal>;
  allProposals: RDFProposal[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [proposals, setProposals] = useState<RDFProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const committeeAddress = useMemo(() => {
    return (deployedContracts as any)?.[chainId]?.ValidationCommittee?.address as `0x${string}` | undefined;
  }, [chainId]);

  useEffect(() => {
    if (!publicClient || !committeeAddress) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProposals() {
      setIsLoading(true);
      setError(null);

      try {
        // Get ProposalCreated events
        const createdLogs = await publicClient!.getLogs({
          address: committeeAddress,
          event: {
            type: "event",
            name: "ProposalCreated",
            inputs: [
              { name: "proposalId", type: "uint256", indexed: false },
              { name: "proposer", type: "address", indexed: false },
              { name: "targets", type: "address[]", indexed: false },
              { name: "values", type: "uint256[]", indexed: false },
              { name: "signatures", type: "string[]", indexed: false },
              { name: "calldatas", type: "bytes[]", indexed: false },
              { name: "voteStart", type: "uint256", indexed: false },
              { name: "voteEnd", type: "uint256", indexed: false },
              { name: "description", type: "string", indexed: false },
            ],
          },
          fromBlock: 0n,
          toBlock: "latest",
        });

        if (cancelled) return;

        // Filter for RDF-APPROVAL proposals
        const rdfProposals: RDFProposal[] = [];

        for (const log of createdLogs) {
          const args = log.args;
          if (!args?.description || !args?.proposalId) continue;

          const graphId = extractGraphId(args.description);
          if (!graphId) continue;

          // Get current proposal state
          let stateIndex = 0;
          try {
            const stateResult = await publicClient!.readContract({
              address: committeeAddress!,
              abi: VALIDATION_COMMITTEE_ABI,
              functionName: "state",
              args: [args.proposalId],
            });
            stateIndex = Number(stateResult);
          } catch {
            // Default to Pending if state query fails
          }

          // Get vote tallies
          let forVotes = 0n;
          let againstVotes = 0n;
          let abstainVotes = 0n;
          try {
            const votesResult = await publicClient!.readContract({
              address: committeeAddress!,
              abi: VALIDATION_COMMITTEE_ABI,
              functionName: "proposalVotes",
              args: [args.proposalId],
            });
            againstVotes = (votesResult as [bigint, bigint, bigint])[0];
            forVotes = (votesResult as [bigint, bigint, bigint])[1];
            abstainVotes = (votesResult as [bigint, bigint, bigint])[2];
          } catch {
            // Default to 0 if query fails
          }

          rdfProposals.push({
            proposalId: args.proposalId,
            graphId,
            description: args.description,
            proposer: args.proposer || "",
            voteStart: args.voteStart || 0n,
            voteEnd: args.voteEnd || 0n,
            state: PROPOSAL_STATES[stateIndex] || "Pending",
            stateIndex,
            votes: { forVotes, againstVotes, abstainVotes },
          });
        }

        if (!cancelled) {
          setProposals(rdfProposals);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch proposals");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchProposals();

    return () => {
      cancelled = true;
    };
  }, [publicClient, committeeAddress, fetchTrigger]);

  // Build map keyed by graphId
  const proposalMap = useMemo(() => {
    const map = new Map<string, RDFProposal>();
    for (const p of proposals) {
      map.set(p.graphId, p);
    }
    return map;
  }, [proposals]);

  const refetch = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  return {
    proposals: proposalMap,
    allProposals: proposals,
    isLoading,
    error,
    refetch,
  };
}
