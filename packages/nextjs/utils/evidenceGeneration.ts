/**
 * Cryptographic and Utility Functions
 *
 * Basic utilities for hashing and timestamp generation.
 * Used across the application for content verification.
 */

/**
 * Hash a string using Web Crypto API (SHA-256)
 * Works in both browser and Node.js environments
 *
 * @param data - The string to hash
 * @returns Hex-encoded SHA-256 hash (without 0x prefix)
 */
export async function sha256Hash(data: string): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js environment
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Hash a string and return with 0x prefix (for blockchain compatibility)
 *
 * @param data - The string to hash
 * @returns Hex-encoded SHA-256 hash with 0x prefix
 */
export async function sha256HashHex(data: string): Promise<`0x${string}`> {
  const hash = await sha256Hash(data);
  return `0x${hash}`;
}

/**
 * Generate current timestamp in ISO format
 *
 * @returns ISO 8601 formatted timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate TTL (Turtle) RDF syntax
 * Checks for proper structure of pre-processed TTL files following the MKM schema
 *
 * @param content - The TTL file content to validate
 * @returns Validation result with errors and warnings
 */
export function validateTTLSyntax(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!content || content.trim().length === 0) {
    errors.push("File is empty");
    return { isValid: false, errors, warnings };
  }

  // Check for @prefix declarations
  const prefixPattern = /@prefix\s+\w*:\s*<[^>]+>\s*\./g;
  const prefixes = content.match(prefixPattern);
  if (!prefixes || prefixes.length === 0) {
    errors.push("No @prefix declarations found. TTL files must have namespace declarations.");
  }

  // Check for required prefixes for MKM data
  const requiredPrefixes = [
    { prefix: "art:", uri: "http://mkm.ee/article/", description: "Article namespace", required: true },
    { prefix: "ex:", uri: "http://mkm.ee/schema/", description: "Schema namespace", required: true },
    { prefix: "dct:", description: "Dublin Core Terms", required: false },
    { prefix: "prov:", description: "Provenance namespace", required: false },
  ];

  for (const req of requiredPrefixes) {
    if (!content.includes(`@prefix ${req.prefix}`)) {
      if (req.required) {
        errors.push(`Missing required prefix: ${req.prefix} (${req.description})`);
      } else {
        warnings.push(`Recommended prefix not found: ${req.prefix} (${req.description})`);
      }
    }
  }

  // Check for at least one subject definition (article)
  const subjectPattern = /art:\w+\s+a\s+ex:Article/;
  if (!subjectPattern.test(content)) {
    errors.push("No article definition found. Expected pattern: art:ID a ex:Article");
  }

  // Check for basic triple structure (subject predicate object)
  const triplePattern = /\w+:\w+\s+[\w:]+/;
  if (!triplePattern.test(content)) {
    errors.push("No valid RDF triples found");
  }

  // Check for unterminated multi-line strings
  const unclosedQuotes = (content.match(/"""/g) || []).length;
  if (unclosedQuotes % 2 !== 0) {
    errors.push("Unterminated multi-line string literal (unmatched triple quotes)");
  }

  // Check for statement terminators
  if (!content.includes(".") && !content.includes(";")) {
    errors.push("No statement terminators found (missing '.' or ';')");
  }

  // Check for common TTL elements - warnings only
  if (content.includes("ex:bodyText") && !content.includes('"""')) {
    warnings.push("bodyText property found but no multi-line string literal detected");
  }

  // Validate date format if present
  const datePattern = /"\d{4}-\d{2}-\d{2}"\^\^xsd:date/;
  if (content.includes("dct:created") && !datePattern.test(content)) {
    warnings.push("dct:created found but date format may be incorrect (expected YYYY-MM-DD^^xsd:date)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract basic metadata from TTL content
 * Simplified parser for extracting common fields
 *
 * @param content - The TTL file content
 * @returns Extracted metadata fields
 */
export function extractTTLMetadata(content: string): {
  articleId?: string;
  source?: string;
  title?: string;
  created?: string;
  hasClassification: boolean;
  hasKeywords: boolean;
  hasProvenance: boolean;
} {
  // Extract article ID
  const articleIdMatch = content.match(/art:(\w+)\s+a\s+ex:Article/);
  const articleId = articleIdMatch ? articleIdMatch[1] : undefined;

  // Extract source
  const sourceMatch = content.match(/ex:source\s+"([^"]+)"/);
  const source = sourceMatch ? sourceMatch[1] : undefined;

  // Extract title
  const titleMatch = content.match(/dct:title\s+"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : undefined;

  // Extract created date
  const createdMatch = content.match(/dct:created\s+"([^"]+)"/);
  const created = createdMatch ? createdMatch[1] : undefined;

  // Check for classification
  const hasClassification = content.includes("cls:hasEMTAKClassification");

  // Check for keywords
  const hasKeywords = content.includes("nlp:keywords");

  // Check for provenance
  const hasProvenance = content.includes("prov:generatedAtTime") || content.includes("prov:wasGeneratedBy");

  return {
    articleId,
    source,
    title,
    created,
    hasClassification,
    hasKeywords,
    hasProvenance,
  };
}
