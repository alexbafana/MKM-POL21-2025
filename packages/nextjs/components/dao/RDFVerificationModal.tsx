"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon, SpinnerIcon } from "./Icons";

interface ValidationStep {
  id: string;
  label: string;
  status: "pending" | "running" | "passed" | "warning" | "failed" | "skipped";
  details?: string[];
  stats?: Record<string, string | number>;
}

interface RDFVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  graphType: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const GRAPH_TYPE_TO_SHAPES: Record<number, string | null> = {
  0: "article",
  1: "entity",
  4: "employment-event",
};

export function RDFVerificationModal({
  isOpen,
  onClose,
  content,
  graphType,
  onSubmit,
  isSubmitting,
}: RDFVerificationModalProps) {
  const [steps, setSteps] = useState<ValidationStep[]>([
    { id: "syntax", label: "Syntax Validation", status: "pending" },
    { id: "semantics", label: "Semantic Validation", status: "pending" },
    { id: "consistency", label: "Consistency Checks", status: "pending" },
    { id: "summary", label: "Summary", status: "pending" },
  ]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [overallResult, setOverallResult] = useState<"pending" | "passed" | "warning" | "failed">("pending");

  const updateStep = useCallback((id: string, update: Partial<ValidationStep>) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setOverallResult("pending");
    let syntaxPassed = false;
    let semanticResult: "passed" | "warning" | "failed" | "skipped" = "skipped";
    let consistencyPassed = false;

    // Step 1: Syntax Validation
    updateStep("syntax", { status: "running" });
    try {
      const res = await fetch("/api/bdi-agent/validate-syntax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      if (data.success && data.validation) {
        const v = data.validation;
        syntaxPassed = v.isValid;
        const details: string[] = [];
        if (v.errors?.length > 0) {
          details.push(
            ...v.errors.map((e: { message: string; line?: number }) =>
              e.line ? `Line ${e.line}: ${e.message}` : e.message,
            ),
          );
        }
        if (v.warnings?.length > 0) {
          details.push(...v.warnings.map((w: string) => `Warning: ${w}`));
        }

        const stats: Record<string, string | number> = {};
        if (v.stats) {
          if (v.stats.tripleCount !== undefined) stats["Triples"] = v.stats.tripleCount;
          if (v.stats.prefixCount !== undefined) stats["Prefixes"] = v.stats.prefixCount;
          if (v.stats.subjectCount !== undefined) stats["Subjects"] = v.stats.subjectCount;
        }

        updateStep("syntax", {
          status: syntaxPassed ? (v.warnings?.length > 0 ? "warning" : "passed") : "failed",
          details: details.length > 0 ? details : ["All syntax checks passed"],
          stats,
        });
      } else {
        updateStep("syntax", {
          status: "failed",
          details: [data.error || "Unknown validation error"],
        });
      }
    } catch (err) {
      updateStep("syntax", {
        status: "failed",
        details: [`Request failed: ${err instanceof Error ? err.message : "Unknown error"}`],
      });
    }

    // Step 2: Semantic Validation
    const shapesType = GRAPH_TYPE_TO_SHAPES[graphType];
    if (!syntaxPassed) {
      updateStep("semantics", {
        status: "skipped",
        details: ["Skipped: syntax validation must pass first"],
      });
      semanticResult = "skipped";
    } else if (!shapesType) {
      updateStep("semantics", {
        status: "skipped",
        details: [`No SHACL shapes available for this graph type. Semantic validation skipped.`],
      });
      semanticResult = "skipped";
    } else {
      updateStep("semantics", { status: "running" });
      try {
        const res = await fetch("/api/bdi-agent/validate-semantics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, shapesType }),
        });
        const data = await res.json();

        if (data.success && data.validation) {
          const v = data.validation;
          const details: string[] = [];
          if (v.violations?.length > 0) {
            for (const viol of v.violations) {
              const severity = viol.severity === "Warning" ? "Warning" : viol.severity === "Info" ? "Info" : "Error";
              details.push(`[${severity}] ${viol.message}${viol.focusNode ? ` (${viol.focusNode})` : ""}`);
            }
          }

          const hasErrors = v.violations?.some((viol: { severity?: string }) => viol.severity !== "Warning") ?? false;
          const hasWarnings = v.violations?.some((viol: { severity?: string }) => viol.severity === "Warning") ?? false;

          if (v.conforms) {
            semanticResult = "passed";
          } else if (!hasErrors && hasWarnings) {
            semanticResult = "warning";
          } else {
            semanticResult = "failed";
          }

          const stats: Record<string, string | number> = {};
          if (v.shapesUsed) stats["Shapes Used"] = v.shapesUsed.length;
          if (v.violations) stats["Issues"] = v.violations.length;

          updateStep("semantics", {
            status: semanticResult === "passed" ? "passed" : semanticResult === "warning" ? "warning" : "failed",
            details: details.length > 0 ? details : ["All semantic checks passed"],
            stats,
          });
        } else {
          updateStep("semantics", {
            status: "failed",
            details: [data.error || "Unknown semantic validation error"],
          });
          semanticResult = "failed";
        }
      } catch (err) {
        updateStep("semantics", {
          status: "failed",
          details: [`Request failed: ${err instanceof Error ? err.message : "Unknown error"}`],
        });
        semanticResult = "failed";
      }
    }

    // Step 3: Consistency Checks
    if (!syntaxPassed) {
      updateStep("consistency", {
        status: "skipped",
        details: ["Skipped: syntax validation must pass first"],
      });
    } else {
      updateStep("consistency", { status: "running" });
      try {
        const res = await fetch("/api/bdi-agent/validate-consistency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();

        if (data.success && data.consistency) {
          const c = data.consistency;
          consistencyPassed = c.consistent;
          const details: string[] = [];
          if (c.checks) {
            for (const check of c.checks) {
              details.push(`${check.passed ? "PASS" : "FAIL"}: ${check.name} - ${check.message}`);
            }
          }

          updateStep("consistency", {
            status: consistencyPassed ? "passed" : "warning",
            details,
            stats: c.summary ? { Summary: c.summary } : undefined,
          });
        } else {
          updateStep("consistency", {
            status: "warning",
            details: [data.error || "Consistency check returned no data"],
          });
        }
      } catch (err) {
        updateStep("consistency", {
          status: "warning",
          details: [`Request failed: ${err instanceof Error ? err.message : "Unknown error"}`],
        });
      }
    }

    // Step 4: Summary
    const hasErrors = !syntaxPassed || semanticResult === "failed";
    const hasWarnings = semanticResult === "warning" || !consistencyPassed;

    let overall: "passed" | "warning" | "failed";
    if (hasErrors) {
      overall = "failed";
    } else if (hasWarnings) {
      overall = "warning";
    } else {
      overall = "passed";
    }

    setOverallResult(overall);
    updateStep("summary", {
      status: overall,
      details:
        overall === "passed"
          ? ["All validation checks passed. Ready for submission to the DAO and committee review."]
          : overall === "warning"
            ? [
                "Validation passed with non-blocking warnings.",
                "You can still submit this file. It will be sent for Validation Committee review.",
                "The committee will see the warning details and decide whether to approve.",
              ]
            : ["Validation failed. Please fix the errors above before submitting."],
    });

    setIsRunning(false);
  }, [content, graphType, updateStep]);

  useEffect(() => {
    if (isOpen && !isRunning && overallResult === "pending") {
      runValidation();
    }
  }, [isOpen, isRunning, overallResult, runValidation]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSteps([
        { id: "syntax", label: "Syntax Validation", status: "pending" },
        { id: "semantics", label: "Semantic Validation", status: "pending" },
        { id: "consistency", label: "Consistency Checks", status: "pending" },
        { id: "summary", label: "Summary", status: "pending" },
      ]);
      setExpandedStep(null);
      setOverallResult("pending");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = overallResult === "passed" || overallResult === "warning";

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
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
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          RDF File Verification
        </h3>

        <div className="space-y-3">
          {steps.map(step => (
            <div
              key={step.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                step.status === "failed"
                  ? "border-error/50 bg-error/5"
                  : step.status === "warning"
                    ? "border-warning/50 bg-warning/5"
                    : step.status === "passed"
                      ? "border-success/50 bg-success/5"
                      : step.status === "skipped"
                        ? "border-base-300 bg-base-200/50"
                        : "border-base-300"
              }`}
            >
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left"
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                disabled={step.status === "pending"}
              >
                <div className="flex items-center gap-3">
                  {step.status === "running" && <SpinnerIcon className="w-5 h-5 text-primary" />}
                  {step.status === "passed" && <CheckCircleIcon className="w-5 h-5 text-success" />}
                  {step.status === "warning" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-warning"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  )}
                  {step.status === "failed" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-error"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {step.status === "skipped" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-base-content/40"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z"
                      />
                    </svg>
                  )}
                  {step.status === "pending" && (
                    <div className="w-5 h-5 rounded-full border-2 border-base-content/20" />
                  )}
                  <span className="font-medium">{step.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {step.stats &&
                    Object.entries(step.stats).map(([key, val]) => (
                      <span key={key} className="badge badge-sm badge-outline">
                        {key}: {val}
                      </span>
                    ))}
                  {step.status !== "pending" && step.status !== "running" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-4 h-4 transition-transform ${expandedStep === step.id ? "rotate-180" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  )}
                </div>
              </button>

              {expandedStep === step.id && step.details && (
                <div className="px-4 pb-3 border-t border-base-300/50">
                  <ul className="text-sm space-y-1 mt-2">
                    {step.details.map((detail, i) => (
                      <li
                        key={i}
                        className={`font-mono text-xs ${
                          detail.startsWith("FAIL") || detail.startsWith("[Error]")
                            ? "text-error"
                            : detail.startsWith("Warning:") || detail.startsWith("[Warning]")
                              ? "text-warning"
                              : detail.startsWith("PASS") || detail.startsWith("[Info]")
                                ? "text-success"
                                : "text-base-content/70"
                        }`}
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            {canSubmit ? "Cancel" : "Close"}
          </button>
          {canSubmit && (
            <button
              className={`btn gap-2 ${overallResult === "warning" ? "btn-warning" : "btn-success"}`}
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-5 h-5" />
                  Submitting to DAO & Committee...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  {overallResult === "warning" ? "Submit to DAO (with warnings)" : "Submit to DAO"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={!isSubmitting ? onClose : undefined}>
        <button>close</button>
      </div>
    </div>
  );
}
