"use client";

import { useEffect, useState } from "react";
import { ChallengeSetInfo, EmploymentEventArtifactData } from "~~/types/mfssia";

interface EmploymentEventEvidenceModalProps {
  isOpen: boolean;
  onSubmit: (data: EmploymentEventArtifactData) => void;
  onClose: () => void;
  challengeSet: ChallengeSetInfo | null;
  initialData?: Partial<EmploymentEventArtifactData>;
}

type TabId =
  | "source"
  | "content"
  | "nlp"
  | "semantics"
  | "employment"
  | "emtak"
  | "temporal"
  | "provenance"
  | "governance";

const TABS: { id: TabId; label: string; challenge: string }[] = [
  { id: "source", label: "Source", challenge: "C-D-1" },
  { id: "content", label: "Content", challenge: "C-D-2" },
  { id: "nlp", label: "NLP Pipeline", challenge: "C-D-3" },
  { id: "semantics", label: "Semantics", challenge: "C-D-4" },
  { id: "employment", label: "Employment", challenge: "C-D-5" },
  { id: "emtak", label: "EMTAK", challenge: "C-D-6" },
  { id: "temporal", label: "Temporal", challenge: "C-D-7" },
  { id: "provenance", label: "Provenance", challenge: "C-D-8" },
  { id: "governance", label: "Governance", challenge: "C-D-9" },
];

function buildDefaults(initial?: Partial<EmploymentEventArtifactData>): EmploymentEventArtifactData {
  return {
    sourceDomainHash: initial?.sourceDomainHash || "err.ee",
    contentHash: initial?.contentHash || "",
    content: initial?.content || "",
    modelName: initial?.modelName || "EstBERT-1.0",
    modelVersionHash: initial?.modelVersionHash || "",
    softwareTrajectoryHash: initial?.softwareTrajectoryHash || "",
    crossConsistencyScore: initial?.crossConsistencyScore ?? 0.92,
    llmConfidenceScore: initial?.llmConfidenceScore ?? 0.95,
    numericExtractionTrace:
      initial?.numericExtractionTrace ||
      JSON.stringify(
        {
          extractedValues: [
            {
              field: "jobCount",
              value: 150,
              context: "Company announced 150 new positions in regional expansion",
            },
          ],
          model: initial?.modelName || "EstBERT-1.0",
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    emtakCode: initial?.emtakCode || "16102",
    registrySectorMatch: initial?.registrySectorMatch ?? true,
    articleDate: initial?.articleDate || new Date().toISOString().split("T")[0],
    ingestionTimestamp: initial?.ingestionTimestamp || new Date().toISOString(),
    provenanceHash: initial?.provenanceHash || "",
    provWasGeneratedBy:
      initial?.provWasGeneratedBy ||
      `urn:mkm:pipeline:nlp-employment-extraction:${initial?.modelName || "EstBERT-1.0"}`,
    governanceSignature: initial?.governanceSignature || "",
  };
}

/**
 * EmploymentEventEvidenceModal - Collects evidence for Example-D Employment Event Detection challenges
 */
export const EmploymentEventEvidenceModal = ({
  isOpen,
  onSubmit,
  onClose,
  challengeSet,
  initialData,
}: EmploymentEventEvidenceModalProps) => {
  const [data, setData] = useState<EmploymentEventArtifactData>(() => buildDefaults(initialData));
  const [activeTab, setActiveTab] = useState<TabId>("source");
  const [isValid, setIsValid] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setData(buildDefaults(initialData));
      setActiveTab("source");
    }
  }, [isOpen, initialData]);

  // Validate required fields
  useEffect(() => {
    const valid =
      data.content.trim() !== "" &&
      data.modelName.trim() !== "" &&
      data.emtakCode.trim() !== "" &&
      data.articleDate.trim() !== "";
    setIsValid(valid);
  }, [data]);

  const handleSubmit = () => {
    if (isValid) {
      onSubmit({
        ...data,
        ingestionTimestamp: data.ingestionTimestamp || new Date().toISOString(),
      });
    }
  };

  const handleLoadDefaults = () => {
    setData(buildDefaults(initialData));
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-xl">Employment Event Evidence Collection</h3>
            <p className="text-sm text-base-content/70 mt-1">
              Provide data for Example-D Employment Event Detection verification
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
                <span key={c.code} className={`badge badge-sm ${c.mandatory ? "badge-primary" : "badge-ghost"}`}>
                  {c.code.replace("mfssia:", "")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab tab-sm ${activeTab === tab.id ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({tab.challenge})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Source Tab (C-D-1) */}
          {activeTab === "source" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-1: Source Authenticity</strong> - Verifies the article originates from a whitelisted
                  publisher
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Source Domain</span>
                  <span className="label-text-alt">
                    Raw domain string (e.g., err.ee) - oracle checks against whitelist
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="err.ee"
                  className="input input-bordered font-mono text-sm"
                  value={data.sourceDomainHash}
                  onChange={e => setData({ ...data, sourceDomainHash: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Content Hash</span>
                  <span className="label-text-alt">Auto-computed from TTL content</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-computed SHA-256 hash"
                  className="input input-bordered font-mono text-sm"
                  value={data.contentHash}
                  onChange={e => setData({ ...data, contentHash: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Content Tab (C-D-2) */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-2: Content Integrity</strong> - Ensures byte-level identity between ingested article and
                  downstream payload (SHA-256)
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">TTL Content *</span>
                  <span className="label-text-alt">
                    RDF Turtle content - SHA-256 hash (sha256ContentHash) auto-computed
                  </span>
                </label>
                <textarea
                  placeholder="Paste TTL content here..."
                  className="textarea textarea-bordered h-48 font-mono text-sm"
                  value={data.content}
                  onChange={e => setData({ ...data, content: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">{data.content.length} characters</span>
                </label>
              </div>
            </div>
          )}

          {/* NLP Pipeline Tab (C-D-3) */}
          {activeTab === "nlp" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-3: NLP Determinism</strong> - Verifies EstBERT, KeyBERT, EstNER executed with declared
                  versions
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Model Name *</span>
                  <span className="label-text-alt">e.g., EstBERT-1.0</span>
                </label>
                <input
                  type="text"
                  placeholder="EstBERT-1.0"
                  className="input input-bordered"
                  value={data.modelName}
                  onChange={e => setData({ ...data, modelName: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Model Version Hash</span>
                  <span className="label-text-alt">SHA-256 hash of model weights/config</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-computed"
                  className="input input-bordered font-mono text-sm"
                  value={data.modelVersionHash}
                  onChange={e => setData({ ...data, modelVersionHash: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Software Trajectory Hash</span>
                  <span className="label-text-alt">SHA-256 hash of NLP pipeline software trajectory</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-computed"
                  className="input input-bordered font-mono text-sm"
                  value={data.softwareTrajectoryHash}
                  onChange={e => setData({ ...data, softwareTrajectoryHash: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Semantics Tab (C-D-4) */}
          {activeTab === "semantics" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-4: Semantic Coherence</strong> - Checks cross-consistency of extracted triples
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Cross-Consistency Score</span>
                  <span className="label-text-alt">0-1 (pass threshold: 0.7)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  className="range range-primary"
                  value={data.crossConsistencyScore}
                  onChange={e => setData({ ...data, crossConsistencyScore: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs px-2">
                  <span>0 (Poor)</span>
                  <span className="font-mono font-bold">{data.crossConsistencyScore.toFixed(2)}</span>
                  <span>1 (Perfect)</span>
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab (C-D-5) */}
          {activeTab === "employment" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-5: Employment Event Plausibility</strong> - Validates linguistic and contextual support
                  for extracted employment change values (pass: llmConfidenceScore &gt;= 0.9)
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">LLM Confidence Score</span>
                  <span className="label-text-alt">0-1 (pass threshold: 0.9)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  className="range range-secondary"
                  value={data.llmConfidenceScore}
                  onChange={e => setData({ ...data, llmConfidenceScore: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-xs px-2">
                  <span>0 (Low)</span>
                  <span className="font-mono font-bold">{data.llmConfidenceScore.toFixed(2)}</span>
                  <span>1 (High)</span>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Numeric Extraction Trace</span>
                  <span className="label-text-alt">JSON trace of extracted values</span>
                </label>
                <textarea
                  placeholder='{"extractedValues": [...]}'
                  className="textarea textarea-bordered h-32 font-mono text-sm"
                  value={data.numericExtractionTrace}
                  onChange={e => setData({ ...data, numericExtractionTrace: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* EMTAK Tab (C-D-6) */}
          {activeTab === "emtak" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-6: EMTAK Consistency</strong> - Verifies EMTAK classification against business registry
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">EMTAK Code *</span>
                  <span className="label-text-alt">5-digit Estonian classification code</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 16102"
                  className="input input-bordered"
                  maxLength={5}
                  value={data.emtakCode}
                  onChange={e => setData({ ...data, emtakCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                />
                {data.emtakCode && data.emtakCode.length !== 5 && (
                  <label className="label">
                    <span className="label-text-alt text-warning">Must be exactly 5 digits</span>
                  </label>
                )}
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={data.registrySectorMatch}
                    onChange={e => setData({ ...data, registrySectorMatch: e.target.checked })}
                  />
                  <div>
                    <span className="label-text font-semibold">Registry Sector Match</span>
                    <p className="text-xs text-base-content/60">EMTAK code matches Estonian Business Registry sector</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Temporal Tab (C-D-7) */}
          {activeTab === "temporal" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-7: Temporal Validity</strong> - Ensures article falls within allowed policy time window
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Article Date *</span>
                  <span className="label-text-alt">Publication date of the source article</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={data.articleDate}
                  onChange={e => setData({ ...data, articleDate: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Ingestion Timestamp</span>
                  <span className="label-text-alt">Auto-filled with current timestamp</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered font-mono text-sm"
                  value={data.ingestionTimestamp}
                  readOnly
                />
                <label className="label">
                  <span className="label-text-alt">Automatically set when evidence is submitted</span>
                </label>
              </div>
            </div>
          )}

          {/* Provenance Tab (C-D-8) */}
          {activeTab === "provenance" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-8: Provenance Closure</strong> - Ensures every RDF triple is cryptographically linked to
                  the generating PipelineRun
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">provWasGeneratedBy</span>
                  <span className="label-text-alt">prov:wasGeneratedBy URI of the generating PipelineRun</span>
                </label>
                <input
                  type="text"
                  placeholder="urn:mkm:pipeline:nlp-employment-extraction:v2.3.1"
                  className="input input-bordered font-mono text-sm"
                  value={data.provWasGeneratedBy}
                  onChange={e => setData({ ...data, provWasGeneratedBy: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Provenance Hash</span>
                  <span className="label-text-alt">SHA-256 hash of provenance chain</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-computed"
                  className="input input-bordered font-mono text-sm"
                  value={data.provenanceHash}
                  onChange={e => setData({ ...data, provenanceHash: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Governance Tab (C-D-9) */}
          {activeTab === "governance" && (
            <div className="space-y-4">
              <div className="alert alert-info py-2">
                <span className="text-sm">
                  <strong>C-D-9: Governance Acknowledgement</strong> - Determines eligibility for ministry-level
                  analytics
                </span>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Governance Signature</span>
                  <span className="label-text-alt">Auto-generated from wallet address + timestamp</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated on submission"
                  className="input input-bordered font-mono text-sm"
                  value={data.governanceSignature}
                  onChange={e => setData({ ...data, governanceSignature: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">
                    Leave empty to auto-generate from dao-ack:&#123;address&#125;:&#123;timestamp&#125;
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Form Summary */}
        <div className="bg-base-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold mb-3">Evidence Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={data.content ? "text-success" : "text-error"}>{data.content ? "check" : "x"}</span>
              <span>TTL Content *</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.modelName ? "text-success" : "text-error"}>{data.modelName ? "check" : "x"}</span>
              <span>Model Name *</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.emtakCode && data.emtakCode.length === 5 ? "text-success" : "text-error"}>
                {data.emtakCode && data.emtakCode.length === 5 ? "check" : "x"}
              </span>
              <span>EMTAK Code *</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.articleDate ? "text-success" : "text-error"}>
                {data.articleDate ? "check" : "x"}
              </span>
              <span>Article Date *</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button onClick={handleLoadDefaults} className="btn btn-ghost">
            Load Defaults
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
