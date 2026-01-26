"use client";

import Link from "next/link";
import { CheckCircleIcon } from "./Icons";

interface RDFSubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
  graphURI: string;
  graphType: number;
  datasetVariant: number;
  year: number;
  proposalId?: string;
  proposalError?: string;
  syntaxValid?: boolean;
  semanticValid?: boolean | null;
  consistencyValid?: boolean | null;
}

const GRAPH_TYPE_LABELS = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
const DATASET_LABELS = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

export function RDFSubmissionSuccessModal({
  isOpen,
  onClose,
  graphId,
  graphURI,
  graphType,
  datasetVariant,
  year,
  proposalId,
  proposalError,
  syntaxValid,
  semanticValid,
  consistencyValid,
}: RDFSubmissionSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-success" />
          </div>
          <h3 className="font-bold text-2xl">RDF Graph Submitted</h3>
          <p className="text-base-content/70 mt-2">Your RDF graph has been successfully submitted to the DAO.</p>
        </div>

        {/* Graph Details */}
        <div className="bg-base-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/60">Graph ID</span>
            <span className="font-mono text-xs truncate max-w-[200px]">{graphId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Graph URI</span>
            <span className="font-mono text-xs">{graphURI}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Type</span>
            <span className="font-semibold">{GRAPH_TYPE_LABELS[graphType] || "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Dataset</span>
            <span className="font-semibold">{DATASET_LABELS[datasetVariant] || "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Year</span>
            <span className="font-semibold">{year}</span>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {syntaxValid !== undefined && (
            <div className={`badge gap-1 ${syntaxValid ? "badge-success" : "badge-error"}`}>
              Syntax: {syntaxValid ? "Passed" : "Failed"}
            </div>
          )}
          {semanticValid !== undefined && semanticValid !== null && (
            <div className={`badge gap-1 ${semanticValid ? "badge-success" : "badge-warning"}`}>
              Semantic: {semanticValid ? "Passed" : "Warnings"}
            </div>
          )}
          {consistencyValid !== undefined && consistencyValid !== null && (
            <div className={`badge gap-1 ${consistencyValid ? "badge-success" : "badge-warning"}`}>
              Consistency: {consistencyValid ? "Passed" : "Issues"}
            </div>
          )}
        </div>

        {/* Proposal Info */}
        {proposalId ? (
          <div className="alert bg-info/10 border border-info/20 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-info shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-semibold">Governance Proposal Created</p>
              <p className="text-base-content/70">
                A proposal has been automatically created in the Validation Committee for this RDF graph.
              </p>
              <p className="font-mono text-xs mt-1">
                Proposal ID: {proposalId.length > 20 ? proposalId.slice(0, 20) + "..." : proposalId}
              </p>
            </div>
          </div>
        ) : (
          <div className="alert bg-warning/10 border border-warning/20 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-warning shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-semibold">Proposal Not Created</p>
              <p className="text-base-content/70">
                The RDF graph was submitted on-chain, but the governance proposal could not be created automatically.
                {proposalError && <span className="block font-mono text-xs mt-1 text-error">{proposalError}</span>}
              </p>
              <p className="text-base-content/70 mt-1">
                You can create a proposal manually from the Validation Committee page, or try redeploying the contracts.
              </p>
            </div>
          </div>
        )}

        <div className="modal-action flex-col gap-2">
          <Link href="/committees/validation" className="btn btn-primary w-full" onClick={onClose}>
            View in Validation Committee
          </Link>
          <button className="btn btn-ghost w-full" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </div>
    </div>
  );
}
