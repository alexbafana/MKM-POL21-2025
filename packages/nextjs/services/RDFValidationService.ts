/**
 * RDF Validation Service
 *
 * Real RDF syntax and semantic validation using N3.js and SHACL.
 * Replaces simulated validation with actual parsing.
 *
 * Features:
 * - Syntax validation using N3.js Turtle parser
 * - Detailed error reporting with line numbers
 * - Triple extraction and statistics
 * - SHACL semantic validation (Phase 3)
 */
// @ts-expect-error -- n3 has no type declarations; install @types/n3 when available
import { Parser, Quad, Store } from "n3";

// =============================================================================
// Types
// =============================================================================

export interface SyntaxValidationResult {
  isValid: boolean;
  errors: SyntaxError[];
  warnings: string[];
  stats: {
    tripleCount: number;
    prefixes: string[];
    subjects: number;
    predicates: number;
    objects: number;
  };
}

export interface SyntaxError {
  message: string;
  line?: number;
  column?: number;
  context?: string;
}

export interface SemanticValidationResult {
  conforms: boolean;
  violations: SHACLViolation[];
  shapesUsed: string[];
}

export interface SHACLViolation {
  focusNode: string;
  path: string;
  message: string;
  severity: "Violation" | "Warning" | "Info";
  sourceShape: string;
  value?: string;
}

export interface FullValidationResult {
  syntaxResult: SyntaxValidationResult;
  semanticResult?: SemanticValidationResult;
  isFullyValid: boolean;
  summary: string;
}

// =============================================================================
// RDF Validation Service
// =============================================================================

export class RDFValidationService {
  /**
   * Validate TTL syntax using N3.js parser
   *
   * @param content - Raw TTL content
   * @returns Validation result with detailed errors
   */
  async validateSyntax(content: string): Promise<SyntaxValidationResult> {
    const errors: SyntaxError[] = [];
    const warnings: string[] = [];
    const quads: Quad[] = [];
    const prefixes: Record<string, string> = {};

    // Check for empty content
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        errors: [{ message: "Content is empty" }],
        warnings: [],
        stats: { tripleCount: 0, prefixes: [], subjects: 0, predicates: 0, objects: 0 },
      };
    }

    // Create N3 parser
    const parser = new Parser({ format: "Turtle" });

    return new Promise(resolve => {
      try {
        // Parse the TTL content
        parser.parse(content, (error: any, quad: any, prefixesResult: any) => {
          if (error) {
            // Extract line/column from error message if possible
            const lineMatch = error.message.match(/line (\d+)/i);
            const columnMatch = error.message.match(/column (\d+)/i);

            errors.push({
              message: error.message,
              line: lineMatch ? parseInt(lineMatch[1]) : undefined,
              column: columnMatch ? parseInt(columnMatch[1]) : undefined,
              context: this.extractErrorContext(content, lineMatch ? parseInt(lineMatch[1]) : undefined),
            });
          } else if (quad) {
            quads.push(quad);
          } else {
            // Parsing complete - prefixesResult contains prefixes
            if (prefixesResult) {
              Object.assign(prefixes, prefixesResult);
            }

            // Check for common issues that might be warnings
            this.checkForWarnings(content, quads, warnings);

            // Calculate statistics
            const subjects = new Set(quads.map(q => q.subject.value));
            const predicates = new Set(quads.map(q => q.predicate.value));
            const objects = new Set(quads.map(q => q.object.value));

            resolve({
              isValid: errors.length === 0,
              errors,
              warnings,
              stats: {
                tripleCount: quads.length,
                prefixes: Object.keys(prefixes),
                subjects: subjects.size,
                predicates: predicates.size,
                objects: objects.size,
              },
            });
          }
        });
      } catch (error: unknown) {
        // Handle synchronous parsing errors
        const message = error instanceof Error ? error.message : "Unknown parsing error";
        errors.push({ message });

        resolve({
          isValid: false,
          errors,
          warnings: [],
          stats: { tripleCount: 0, prefixes: [], subjects: 0, predicates: 0, objects: 0 },
        });
      }
    });
  }

  /**
   * Validate TTL semantics using SHACL shapes
   *
   * @param content - Raw TTL content
   * @param shapesContent - SHACL shapes as TTL string
   * @returns Semantic validation result
   */
  async validateSemantics(content: string, shapesContent: string): Promise<SemanticValidationResult> {
    // Dynamic import to avoid issues with SHACL library initialization
    try {
      // First parse both the data and shapes
      const dataStore = await this.parseToStore(content);
      const shapesStore = await this.parseToStore(shapesContent);

      // Import rdf-validate-shacl dynamically
      const SHACLValidator = (await import("rdf-validate-shacl")).default;

      // Create validator with shapes
      const validator = new (SHACLValidator as any)(shapesStore);

      // Run validation
      const report = await validator.validate(dataStore);

      // Extract violations
      const violations: SHACLViolation[] = [];
      const shapesUsed = new Set<string>();

      for (const result of report.results) {
        shapesUsed.add(result.sourceShape?.value || "unknown");

        violations.push({
          focusNode: result.focusNode?.value || "unknown",
          path: result.path?.value || "unknown",
          message: result.message?.[0]?.value || "Validation failed",
          severity: this.mapSeverity(result.severity?.value),
          sourceShape: result.sourceShape?.value || "unknown",
          value: result.value?.value,
        });
      }

      return {
        conforms: report.conforms,
        violations,
        shapesUsed: Array.from(shapesUsed),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "SHACL validation error";
      return {
        conforms: false,
        violations: [
          {
            focusNode: "validation-process",
            path: "n/a",
            message: `SHACL validation failed: ${message}`,
            severity: "Violation",
            sourceShape: "internal",
          },
        ],
        shapesUsed: [],
      };
    }
  }

  /**
   * Full validation (syntax + semantics)
   *
   * @param content - Raw TTL content
   * @param shapesContent - Optional SHACL shapes
   * @returns Complete validation result
   */
  async validateFull(content: string, shapesContent?: string): Promise<FullValidationResult> {
    // Always run syntax validation
    const syntaxResult = await this.validateSyntax(content);

    // Run semantic validation only if syntax is valid and shapes are provided
    let semanticResult: SemanticValidationResult | undefined;
    if (syntaxResult.isValid && shapesContent) {
      semanticResult = await this.validateSemantics(content, shapesContent);
    }

    const isFullyValid = syntaxResult.isValid && (!semanticResult || semanticResult.conforms);

    // Generate summary
    let summary = "";
    if (!syntaxResult.isValid) {
      summary = `Syntax validation failed with ${syntaxResult.errors.length} error(s)`;
    } else if (semanticResult && !semanticResult.conforms) {
      summary = `Semantic validation failed with ${semanticResult.violations.length} violation(s)`;
    } else {
      summary = `Valid TTL with ${syntaxResult.stats.tripleCount} triple(s)`;
    }

    return {
      syntaxResult,
      semanticResult,
      isFullyValid,
      summary,
    };
  }

  /**
   * Quick syntax check (lighter weight)
   */
  async quickSyntaxCheck(content: string): Promise<{ isValid: boolean; error?: string }> {
    const parser = new Parser({ format: "Turtle" });

    return new Promise(resolve => {
      try {
        let hasError = false;
        let errorMessage = "";

        parser.parse(content, (error: any, quad: any) => {
          if (error && !hasError) {
            hasError = true;
            errorMessage = error.message;
          }

          if (!quad && !error) {
            // Parsing complete
            resolve({ isValid: !hasError, error: hasError ? errorMessage : undefined });
          }
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Parse error";
        resolve({ isValid: false, error: message });
      }
    });
  }

  /**
   * Extract triples from TTL content
   */
  async extractTriples(content: string): Promise<{
    triples: Array<{ subject: string; predicate: string; object: string }>;
    error?: string;
  }> {
    const parser = new Parser({ format: "Turtle" });
    const triples: Array<{ subject: string; predicate: string; object: string }> = [];

    return new Promise(resolve => {
      try {
        parser.parse(content, (error: any, quad: any) => {
          if (error) {
            resolve({ triples: [], error: error.message });
          } else if (quad) {
            triples.push({
              subject: quad.subject.value,
              predicate: quad.predicate.value,
              object: quad.object.value,
            });
          } else {
            resolve({ triples });
          }
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Parse error";
        resolve({ triples: [], error: message });
      }
    });
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private extractErrorContext(content: string, line?: number): string | undefined {
    if (!line) return undefined;

    const lines = content.split("\n");
    const startLine = Math.max(0, line - 2);
    const endLine = Math.min(lines.length, line + 1);

    return lines
      .slice(startLine, endLine)
      .map((l, i) => `${startLine + i + 1}: ${l}`)
      .join("\n");
  }

  private checkForWarnings(content: string, quads: Quad[], warnings: string[]): void {
    // Check for common MKM prefixes
    if (quads.length > 0) {
      const hasArticleType = quads.some(
        q =>
          q.predicate.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && q.object.value.includes("Article"),
      );

      if (!hasArticleType && content.includes("art:")) {
        warnings.push("Content uses art: prefix but no explicit Article type declaration found");
      }
    }

    // Check for missing provenance
    const hasProvenance = quads.some(
      q => q.predicate.value.includes("prov") || q.predicate.value.includes("provenance"),
    );
    if (!hasProvenance && content.includes("prov:")) {
      warnings.push("Provenance prefix declared but no provenance triples found");
    }

    // Check for date format
    if (content.includes("dct:created") || content.includes("dct:modified")) {
      const hasXsdDate = content.includes("^^xsd:date") || content.includes("^^xsd:dateTime");
      if (!hasXsdDate) {
        warnings.push("Date properties found but may not have proper xsd:date or xsd:dateTime typing");
      }
    }
  }

  private async parseToStore(content: string): Promise<Store> {
    const store = new Store();
    const parser = new Parser({ format: "Turtle" });

    return new Promise((resolve, reject) => {
      parser.parse(content, (error: any, quad: any) => {
        if (error) {
          reject(error);
        } else if (quad) {
          store.addQuad(quad);
        } else {
          resolve(store);
        }
      });
    });
  }

  private mapSeverity(severityUri?: string): "Violation" | "Warning" | "Info" {
    if (!severityUri) return "Violation";

    if (severityUri.includes("Violation")) return "Violation";
    if (severityUri.includes("Warning")) return "Warning";
    if (severityUri.includes("Info")) return "Info";

    return "Violation";
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let rdfValidationServiceInstance: RDFValidationService | null = null;

export function getRDFValidationService(): RDFValidationService {
  if (!rdfValidationServiceInstance) {
    rdfValidationServiceInstance = new RDFValidationService();
  }
  return rdfValidationServiceInstance;
}

export function resetRDFValidationService(): void {
  rdfValidationServiceInstance = null;
}
