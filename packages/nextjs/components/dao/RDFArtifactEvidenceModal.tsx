"use client";

import { useEffect, useState } from "react";
import { ChallengeSetInfo, RDFArtifactData } from "~~/types/mfssia";

interface RDFArtifactEvidenceModalProps {
  isOpen: boolean;
  onSubmit: (artifactData: RDFArtifactData) => void;
  onClose: () => void;
  challengeSet: ChallengeSetInfo | null;
  targetChallenge?: string; // Which specific challenge to focus on
}

/**
 * Default sample RDF artifact for testing/demo purposes
 */
const SAMPLE_ARTIFACT: RDFArtifactData = {
  sourceDomain: "https://www.err.ee/",
  sourceUrl: "https://www.err.ee/1609192024/parnu-mooblitootja-woodhive-loob-120-uut-toekohta",
  contentHash: "",
  content: `Pärnu mööblitootja WoodHive teatas esmaspäeval, et ettevõte avab sügisel uue tootmishoone ning loob 120 uut töökohta. Laienemise põhjusena toodi kasvav nõudlus eksportturgudel, eriti Soomes ja Rootsis. Ettevõtte juht Tarvo Kivimägi sõnul on eesmärk tõsta tootmismahtu 40% võrra järgmise kahe aasta jooksul.`,
  claimedPublishDate: new Date().toISOString().split("T")[0],
  serverTimestamp: new Date().toISOString(),
  authorName: "ERR Uudised",
  authorEmailDomain: "err.ee",
  networkClusterScore: 0.1,
};

/**
 * RDFArtifactEvidenceModal - Collects RDF artifact data for Example-A challenge verification
 * Used for Baseline RDF Artifact Integrity challenges
 */
export const RDFArtifactEvidenceModal = ({
  isOpen,
  onSubmit,
  onClose,
  challengeSet,
  targetChallenge,
}: RDFArtifactEvidenceModalProps) => {
  const [artifactData, setArtifactData] = useState<RDFArtifactData>(SAMPLE_ARTIFACT);
  const [activeTab, setActiveTab] = useState<"source" | "content" | "temporal" | "author" | "distribution">("source");
  const [isValid, setIsValid] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setArtifactData(SAMPLE_ARTIFACT);
      setActiveTab("source");
    }
  }, [isOpen]);

  // Validate required fields
  useEffect(() => {
    const requiredFieldsFilled =
      artifactData.sourceDomain.trim() !== "" &&
      artifactData.content.trim() !== "" &&
      artifactData.claimedPublishDate.trim() !== "" &&
      artifactData.authorName.trim() !== "";
    setIsValid(requiredFieldsFilled);
  }, [artifactData]);

  const handleSubmit = () => {
    if (isValid) {
      // Ensure serverTimestamp is current
      onSubmit({
        ...artifactData,
        serverTimestamp: new Date().toISOString(),
      });
    }
  };

  const handleLoadSample = () => {
    setArtifactData(SAMPLE_ARTIFACT);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-xl">RDF Artifact Evidence Collection</h3>
            <p className="text-sm text-base-content/70 mt-1">
              Provide article/artifact data for integrity verification
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            x
          </button>
        </div>

        {/* Challenge Set Info */}
        {challengeSet && (
          <div className="bg-info/10 rounded-lg p-4 mb-6 border border-info/20">
            <div className="flex items-center gap-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold text-info">{challengeSet.name}</span>
            </div>
            <p className="text-sm text-base-content/70">{challengeSet.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {challengeSet.challenges.map(c => (
                <span
                  key={c.code}
                  className={`badge badge-sm ${
                    c.mandatory ? "badge-primary" : "badge-ghost"
                  } ${targetChallenge === c.code ? "ring-2 ring-warning" : ""}`}
                >
                  {c.code.replace("mfssia:", "")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === "source" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("source")}
          >
            Source (C-A-1)
          </button>
          <button
            className={`tab ${activeTab === "content" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("content")}
          >
            Content (C-A-2)
          </button>
          <button
            className={`tab ${activeTab === "temporal" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("temporal")}
          >
            Temporal (C-A-3)
          </button>
          <button
            className={`tab ${activeTab === "author" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("author")}
          >
            Author (C-A-4)
          </button>
          <button
            className={`tab ${activeTab === "distribution" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("distribution")}
          >
            Distribution (C-A-6)
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Source Tab (C-A-1) */}
          {activeTab === "source" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-A-1: Source Authenticity</strong> - Verifies the article originates from a whitelisted
                  publisher
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Source Domain *</span>
                  <span className="label-text-alt">e.g., err.ee, delfi.ee</span>
                </label>
                <input
                  type="text"
                  placeholder="https://www.err.ee/"
                  className="input input-bordered"
                  value={artifactData.sourceDomain}
                  onChange={e => setArtifactData({ ...artifactData, sourceDomain: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Source URL (Optional)</span>
                  <span className="label-text-alt">Full article URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://www.err.ee/article/..."
                  className="input input-bordered"
                  value={artifactData.sourceUrl || ""}
                  onChange={e => setArtifactData({ ...artifactData, sourceUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Content Tab (C-A-2) */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-A-2: Content Integrity</strong> - Detects tampering or near-duplicate flagged content
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Article Content *</span>
                  <span className="label-text-alt">Paste the full article text</span>
                </label>
                <textarea
                  placeholder="Paste the article content here..."
                  className="textarea textarea-bordered h-48"
                  value={artifactData.content}
                  onChange={e => setArtifactData({ ...artifactData, content: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">{artifactData.content.length} characters</span>
                </label>
              </div>
            </div>
          )}

          {/* Temporal Tab (C-A-3) */}
          {activeTab === "temporal" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-A-3: Temporal Validity</strong> - Verifies the publish date is accurate and not backdated
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Claimed Publish Date *</span>
                  <span className="label-text-alt">Date the article claims to be published</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={artifactData.claimedPublishDate}
                  onChange={e => setArtifactData({ ...artifactData, claimedPublishDate: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Archive Earliest Capture Date (Optional)</span>
                  <span className="label-text-alt">From web.archive.org or similar</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={artifactData.archiveEarliestCaptureDate || ""}
                  onChange={e => setArtifactData({ ...artifactData, archiveEarliestCaptureDate: e.target.value })}
                />
              </div>
              <div className="bg-base-200 rounded-lg p-3 text-sm">
                <p className="font-semibold mb-1">Server Timestamp:</p>
                <code className="text-xs">{new Date().toISOString()}</code>
                <p className="text-xs text-base-content/60 mt-1">Automatically set when evidence is submitted</p>
              </div>
            </div>
          )}

          {/* Author Tab (C-A-4) */}
          {activeTab === "author" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-A-4: Author Authenticity</strong> - Verifies the author identity and affiliation
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Author Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., ERR Uudised, Tarvo Kivimägi"
                  className="input input-bordered"
                  value={artifactData.authorName}
                  onChange={e => setArtifactData({ ...artifactData, authorName: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Author Email Domain (Optional)</span>
                  <span className="label-text-alt">e.g., err.ee, delfi.ee</span>
                </label>
                <input
                  type="text"
                  placeholder="err.ee"
                  className="input input-bordered"
                  value={artifactData.authorEmailDomain || ""}
                  onChange={e => setArtifactData({ ...artifactData, authorEmailDomain: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Distribution Tab (C-A-6) */}
          {activeTab === "distribution" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-A-6: Distribution Integrity</strong> - Detects coordinated inauthentic amplification
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Share Event Timestamps (Optional)</span>
                  <span className="label-text-alt">Comma-separated ISO timestamps</span>
                </label>
                <input
                  type="text"
                  placeholder="2024-01-15T10:00:00Z, 2024-01-15T10:05:00Z"
                  className="input input-bordered"
                  value={artifactData.shareEventTimestamps || ""}
                  onChange={e => setArtifactData({ ...artifactData, shareEventTimestamps: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Account Trust Signals (Optional)</span>
                  <span className="label-text-alt">Trust indicators for sharing accounts</span>
                </label>
                <select
                  className="select select-bordered"
                  value={artifactData.accountTrustSignals || "UNVERIFIED"}
                  onChange={e => setArtifactData({ ...artifactData, accountTrustSignals: e.target.value })}
                >
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="INSTITUTIONAL">Institutional</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Network Cluster Score (Optional)</span>
                  <span className="label-text-alt">0-1, lower is better (less coordinated behavior)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="range range-primary"
                  value={artifactData.networkClusterScore ?? 0.1}
                  onChange={e => setArtifactData({ ...artifactData, networkClusterScore: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs px-2">
                  <span>0 (Best)</span>
                  <span className="font-mono">{(artifactData.networkClusterScore ?? 0.1).toFixed(2)}</span>
                  <span>1 (Suspicious)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Summary */}
        <div className="bg-base-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold mb-3">Evidence Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={artifactData.sourceDomain ? "text-success" : "text-error"}>
                {artifactData.sourceDomain ? "check" : "x"}
              </span>
              <span>Source Domain</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={artifactData.content ? "text-success" : "text-error"}>
                {artifactData.content ? "check" : "x"}
              </span>
              <span>Content</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={artifactData.claimedPublishDate ? "text-success" : "text-error"}>
                {artifactData.claimedPublishDate ? "check" : "x"}
              </span>
              <span>Publish Date</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={artifactData.authorName ? "text-success" : "text-error"}>
                {artifactData.authorName ? "check" : "x"}
              </span>
              <span>Author Name</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button onClick={handleLoadSample} className="btn btn-ghost">
            Load Sample Data
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!isValid} className="btn btn-primary">
            Collect Evidence
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};
