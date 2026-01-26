/**
 * TTL Storage Service
 *
 * Server-side encrypted storage for TTL (Turtle RDF) files.
 * Enables BDI agents to access and validate TTL content that was uploaded
 * via the Data Provision page.
 *
 * Features:
 * - AES-256-GCM encryption for secure storage
 * - Hash verification for integrity checking
 * - GraphId linking for blockchain-storage correlation
 * - Index file for fast lookups
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

// =============================================================================
// Types
// =============================================================================

export interface StorageEntry {
  storageId: string;
  contentHash: string; // SHA-256 hash of original content
  encryptedFilePath: string;
  createdAt: string;
  fileSize: number;
  graphId?: string; // Linked after blockchain submission
  linkedAt?: string;
  metadata?: {
    graphType?: number;
    datasetVariant?: number;
    year?: number;
    modelVersion?: string;
    graphURI?: string;
    submitter?: string;
  };
}

export interface StorageIndex {
  version: string;
  entries: Record<string, StorageEntry>; // storageId -> entry
  graphIdMap: Record<string, string>; // graphId -> storageId
  hashMap: Record<string, string>; // contentHash -> storageId
}

export interface UploadResult {
  storageId: string;
  contentHash: string;
  fileSize: number;
}

export interface RetrieveResult {
  content: string;
  storageId: string;
  contentHash: string;
  metadata?: StorageEntry["metadata"];
  graphId?: string;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_DIR = join(process.cwd(), "data", "ttl-storage");
const INDEX_FILE = join(STORAGE_DIR, "index.json");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// =============================================================================
// TTL Storage Service
// =============================================================================

export class TTLStorageService {
  private encryptionKey: Buffer;

  constructor() {
    const keyHex = process.env.TTL_STORAGE_KEY;
    if (!keyHex) {
      // Generate a warning but use a fallback for development
      console.warn(
        "[TTLStorageService] WARNING: TTL_STORAGE_KEY not set. Using insecure fallback key. Set TTL_STORAGE_KEY in .env for production.",
      );
      // Generate deterministic fallback for development (NOT SECURE FOR PRODUCTION)
      this.encryptionKey = createHash("sha256").update("dev-fallback-key-not-for-production").digest();
    } else {
      // Parse hex key (must be 64 hex chars = 32 bytes)
      if (keyHex.length !== 64) {
        throw new Error("TTL_STORAGE_KEY must be exactly 64 hex characters (32 bytes)");
      }
      this.encryptionKey = Buffer.from(keyHex, "hex");
    }

    // Ensure storage directory exists
    this.ensureStorageDir();
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private ensureStorageDir(): void {
    if (!existsSync(STORAGE_DIR)) {
      mkdirSync(STORAGE_DIR, { recursive: true });
      console.log(`[TTLStorageService] Created storage directory: ${STORAGE_DIR}`);
    }
  }

  private loadIndex(): StorageIndex {
    if (!existsSync(INDEX_FILE)) {
      return {
        version: "1.0.0",
        entries: {},
        graphIdMap: {},
        hashMap: {},
      };
    }
    try {
      const data = readFileSync(INDEX_FILE, "utf-8");
      return JSON.parse(data) as StorageIndex;
    } catch (error) {
      console.error("[TTLStorageService] Failed to load index, creating new:", error);
      return {
        version: "1.0.0",
        entries: {},
        graphIdMap: {},
        hashMap: {},
      };
    }
  }

  private saveIndex(index: StorageIndex): void {
    writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  private generateStorageId(): string {
    return `ttl-${Date.now()}-${randomBytes(8).toString("hex")}`;
  }

  private computeHash(content: string): string {
    return "0x" + createHash("sha256").update(content).digest("hex");
  }

  private encrypt(content: string): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(content, "utf-8"), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  private decrypt(encryptedData: Buffer, iv: Buffer, authTag: Buffer): string {
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString("utf-8");
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Store TTL content with encryption
   *
   * @param content - Raw TTL content
   * @param expectedHash - Expected SHA-256 hash (optional, for verification)
   * @param metadata - Optional metadata about the graph
   * @returns Upload result with storageId and hash
   */
  async store(content: string, expectedHash?: string, metadata?: StorageEntry["metadata"]): Promise<UploadResult> {
    // Validate content size
    const contentSize = Buffer.byteLength(content, "utf-8");
    if (contentSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${contentSize} bytes exceeds ${MAX_FILE_SIZE} byte limit`);
    }

    // Compute hash
    const contentHash = this.computeHash(content);

    // Verify hash if provided
    if (expectedHash && expectedHash.toLowerCase() !== contentHash.toLowerCase()) {
      throw new Error(`Hash mismatch: expected ${expectedHash}, computed ${contentHash}`);
    }

    // Check for duplicate by hash
    const index = this.loadIndex();
    if (index.hashMap[contentHash]) {
      // Return existing entry instead of duplicating
      const existingId = index.hashMap[contentHash];
      const existingEntry = index.entries[existingId];
      console.log(`[TTLStorageService] Duplicate content detected, returning existing storageId: ${existingId}`);
      return {
        storageId: existingId,
        contentHash: existingEntry.contentHash,
        fileSize: existingEntry.fileSize,
      };
    }

    // Generate storage ID
    const storageId = this.generateStorageId();

    // Encrypt content
    const { encrypted, iv, authTag } = this.encrypt(content);

    // Combine IV + authTag + encrypted data for storage
    const storedData = Buffer.concat([iv, authTag, encrypted]);

    // Write encrypted file
    const encryptedFilePath = join(STORAGE_DIR, `${storageId}.enc`);
    writeFileSync(encryptedFilePath, storedData);

    // Create index entry
    const entry: StorageEntry = {
      storageId,
      contentHash,
      encryptedFilePath,
      createdAt: new Date().toISOString(),
      fileSize: contentSize,
      metadata,
    };

    // Update index
    index.entries[storageId] = entry;
    index.hashMap[contentHash] = storageId;
    this.saveIndex(index);

    console.log(`[TTLStorageService] Stored TTL file: ${storageId} (${contentSize} bytes)`);

    return {
      storageId,
      contentHash,
      fileSize: contentSize,
    };
  }

  /**
   * Link a storageId with a blockchain graphId
   *
   * @param storageId - Storage identifier
   * @param graphId - On-chain graph identifier
   */
  async linkGraphId(storageId: string, graphId: string): Promise<void> {
    const index = this.loadIndex();

    if (!index.entries[storageId]) {
      throw new Error(`Storage entry not found: ${storageId}`);
    }

    // Update entry with graphId
    index.entries[storageId].graphId = graphId;
    index.entries[storageId].linkedAt = new Date().toISOString();

    // Add to graphId map
    index.graphIdMap[graphId] = storageId;

    this.saveIndex(index);

    console.log(`[TTLStorageService] Linked storageId ${storageId} to graphId ${graphId}`);
  }

  /**
   * Retrieve TTL content by storageId
   *
   * @param storageId - Storage identifier
   * @returns Decrypted content and metadata
   */
  async retrieve(storageId: string): Promise<RetrieveResult> {
    const index = this.loadIndex();
    const entry = index.entries[storageId];

    if (!entry) {
      throw new Error(`Storage entry not found: ${storageId}`);
    }

    // Read encrypted file
    if (!existsSync(entry.encryptedFilePath)) {
      throw new Error(`Encrypted file not found: ${entry.encryptedFilePath}`);
    }

    const storedData = readFileSync(entry.encryptedFilePath);

    // Extract IV, authTag, and encrypted data
    const iv = storedData.subarray(0, IV_LENGTH);
    const authTag = storedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = storedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Decrypt
    const content = this.decrypt(encrypted, iv, authTag);

    // Verify hash
    const computedHash = this.computeHash(content);
    if (computedHash.toLowerCase() !== entry.contentHash.toLowerCase()) {
      throw new Error("Content integrity check failed: hash mismatch after decryption");
    }

    return {
      content,
      storageId: entry.storageId,
      contentHash: entry.contentHash,
      metadata: entry.metadata,
      graphId: entry.graphId,
    };
  }

  /**
   * Retrieve TTL content by graphId
   *
   * @param graphId - On-chain graph identifier
   * @returns Decrypted content and metadata
   */
  async getByGraphId(graphId: string): Promise<RetrieveResult> {
    const index = this.loadIndex();
    const storageId = index.graphIdMap[graphId];

    if (!storageId) {
      throw new Error(`No storage entry linked to graphId: ${graphId}`);
    }

    return this.retrieve(storageId);
  }

  /**
   * Retrieve TTL content by content hash
   *
   * @param contentHash - SHA-256 hash of the content
   * @returns Decrypted content and metadata
   */
  async getByHash(contentHash: string): Promise<RetrieveResult> {
    const index = this.loadIndex();
    const storageId = index.hashMap[contentHash.toLowerCase()];

    if (!storageId) {
      // Try with 0x prefix
      const hashWithPrefix = contentHash.startsWith("0x") ? contentHash : `0x${contentHash}`;
      const storageIdAlt = index.hashMap[hashWithPrefix.toLowerCase()];
      if (!storageIdAlt) {
        throw new Error(`No storage entry found for hash: ${contentHash}`);
      }
      return this.retrieve(storageIdAlt);
    }

    return this.retrieve(storageId);
  }

  /**
   * Get storage entry metadata without decrypting content
   *
   * @param storageId - Storage identifier
   */
  async getEntry(storageId: string): Promise<StorageEntry | null> {
    const index = this.loadIndex();
    return index.entries[storageId] || null;
  }

  /**
   * Get entry by graphId without decrypting
   */
  async getEntryByGraphId(graphId: string): Promise<StorageEntry | null> {
    const index = this.loadIndex();
    const storageId = index.graphIdMap[graphId];
    if (!storageId) return null;
    return index.entries[storageId] || null;
  }

  /**
   * Check if content exists by hash
   */
  async existsByHash(contentHash: string): Promise<boolean> {
    const index = this.loadIndex();
    const normalizedHash = contentHash.toLowerCase();
    return !!index.hashMap[normalizedHash] || !!index.hashMap[`0x${normalizedHash.replace("0x", "")}`];
  }

  /**
   * List all storage entries
   */
  async listEntries(): Promise<StorageEntry[]> {
    const index = this.loadIndex();
    return Object.values(index.entries);
  }

  /**
   * List entries awaiting validation (have graphId but no validation result stored)
   */
  async listPendingValidation(): Promise<StorageEntry[]> {
    const index = this.loadIndex();
    return Object.values(index.entries).filter(entry => entry.graphId && !(entry.metadata as any)?.validationResult);
  }

  /**
   * Update metadata for a storage entry
   */
  async updateMetadata(storageId: string, metadata: Partial<StorageEntry["metadata"]>): Promise<void> {
    const index = this.loadIndex();
    const entry = index.entries[storageId];

    if (!entry) {
      throw new Error(`Storage entry not found: ${storageId}`);
    }

    entry.metadata = { ...entry.metadata, ...metadata };
    this.saveIndex(index);
  }

  /**
   * Delete a storage entry (admin only)
   */
  async delete(storageId: string): Promise<void> {
    const index = this.loadIndex();
    const entry = index.entries[storageId];

    if (!entry) {
      throw new Error(`Storage entry not found: ${storageId}`);
    }

    // Delete encrypted file
    if (existsSync(entry.encryptedFilePath)) {
      unlinkSync(entry.encryptedFilePath);
    }

    // Remove from index
    delete index.entries[storageId];
    delete index.hashMap[entry.contentHash];
    if (entry.graphId) {
      delete index.graphIdMap[entry.graphId];
    }

    this.saveIndex(index);
    console.log(`[TTLStorageService] Deleted storage entry: ${storageId}`);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    linkedEntries: number;
    totalSize: number;
  }> {
    const index = this.loadIndex();
    const entries = Object.values(index.entries);

    return {
      totalEntries: entries.length,
      linkedEntries: entries.filter(e => e.graphId).length,
      totalSize: entries.reduce((sum, e) => sum + e.fileSize, 0),
    };
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let ttlStorageServiceInstance: TTLStorageService | null = null;

export function getTTLStorageService(): TTLStorageService {
  if (!ttlStorageServiceInstance) {
    ttlStorageServiceInstance = new TTLStorageService();
  }
  return ttlStorageServiceInstance;
}

export function resetTTLStorageService(): void {
  ttlStorageServiceInstance = null;
}
