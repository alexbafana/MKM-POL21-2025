/**
 * DKG Publisher Service
 *
 * Publishes validated TTL (Turtle RDF) content to the MFSSIA API endpoint
 * (POST /api/rdf with Content-Type: text/turtle). Provides step-by-step
 * progress tracking for the publish workflow.
 *
 * Set DKG_PUBLISHER_ENABLED=true in .env to enable.
 */
import { getTTLStorageService } from "~~/services/TTLStorageService";

// =============================================================================
// Types
// =============================================================================

export interface PublishStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  message: string;
  timestamp: string;
}

export interface PublishResult {
  success: boolean;
  graphId: string;
  dkgAssetUAL: string;
  steps: PublishStep[];
}

// =============================================================================
// Helpers
// =============================================================================

const LOG_PREFIX = "[DKG Publisher]";

function createStep(name: string): PublishStep {
  return {
    name,
    status: "pending",
    message: "",
    timestamp: new Date().toISOString(),
  };
}

function updateStep(step: PublishStep, status: PublishStep["status"], message: string): PublishStep {
  return {
    ...step,
    status,
    message,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// DKG Publisher Service
// =============================================================================

export class DKGPublisherService {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.DKG_PUBLISHER_ENABLED === "true";
    if (this.enabled) {
      console.log(`${LOG_PREFIX} Service initialized (enabled)`);
    } else {
      console.log(`${LOG_PREFIX} Service initialized (disabled - set DKG_PUBLISHER_ENABLED=true to enable)`);
    }
  }

  /**
   * Publish TTL content associated with a graphId to the MFSSIA API.
   *
   * Workflow:
   *  1. Fetch TTL content from TTLStorageService by graphId (skipped if ttlContent provided)
   *  2. Prepare metadata for the publish request
   *  3. POST raw TTL to MFSSIA API /api/rdf (Content-Type: text/turtle)
   *  4. Log note about on-chain recording (done separately from frontend via wagmi)
   *
   * @param graphId - The on-chain graph identifier to publish
   * @param ttlContent - Optional pre-fetched TTL content (skips Step 1 if provided)
   * @returns PublishResult with step-by-step progress and the resulting UAL
   */
  async publishToDKG(graphId: string, ttlContent?: string): Promise<PublishResult> {
    if (!this.enabled) {
      console.warn(`${LOG_PREFIX} Publishing is disabled. Set DKG_PUBLISHER_ENABLED=true to enable.`);
      return {
        success: false,
        graphId,
        dkgAssetUAL: "",
        steps: [updateStep(createStep("Service check"), "failed", "DKG Publisher is disabled")],
      };
    }

    const steps: PublishStep[] = [
      createStep("Fetching TTL content from storage"),
      createStep("Preparing DKG publish request"),
      createStep("Submitting to OriginTrail DKG"),
      createStep("Recording UAL on blockchain"),
    ];

    let resolvedTtlContent = ttlContent || "";
    let metadata: Record<string, unknown> = {};
    let dkgAssetUAL = "";

    // -------------------------------------------------------------------------
    // Step 1: Fetch TTL content from storage (skipped if ttlContent provided)
    // -------------------------------------------------------------------------
    if (resolvedTtlContent) {
      steps[0] = updateStep(
        steps[0],
        "completed",
        `Using provided TTL content (${resolvedTtlContent.length} characters)`,
      );
      console.log(
        `${LOG_PREFIX} Step 1: TTL content provided directly (${resolvedTtlContent.length} chars), skipping storage fetch`,
      );
    } else {
      steps[0] = updateStep(steps[0], "in_progress", "Retrieving TTL content for graphId: " + graphId);
      console.log(`${LOG_PREFIX} Step 1: Fetching TTL content for graphId ${graphId}`);

      try {
        const ttlStorage = getTTLStorageService();
        const result = await ttlStorage.getByGraphId(graphId);
        resolvedTtlContent = result.content;
        metadata = (result.metadata as Record<string, unknown>) ?? {};

        steps[0] = updateStep(
          steps[0],
          "completed",
          `Retrieved ${resolvedTtlContent.length} characters (hash: ${result.contentHash})`,
        );
        console.log(`${LOG_PREFIX} Step 1 completed: ${resolvedTtlContent.length} chars retrieved`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        steps[0] = updateStep(steps[0], "failed", `Failed to fetch TTL content: ${errorMessage}`);
        console.error(`${LOG_PREFIX} Step 1 failed:`, errorMessage);

        return {
          success: false,
          graphId,
          dkgAssetUAL: "",
          steps,
        };
      }
    }

    // -------------------------------------------------------------------------
    // Step 2: Prepare DKG publish request (JSON-LD wrapper)
    // -------------------------------------------------------------------------
    steps[1] = updateStep(steps[1], "in_progress", "Formatting TTL content into JSON-LD wrapper");
    console.log(`${LOG_PREFIX} Step 2: Preparing DKG publish request`);

    try {
      const ttlSize = resolvedTtlContent.length;
      const metadataInfo = {
        graphId,
        contentType: "text/turtle",
        contentSize: ttlSize,
        publishedAt: new Date().toISOString(),
        source: "MKMPOL21-DAO",
        ...metadata,
      };

      steps[1] = updateStep(steps[1], "completed", `Metadata prepared (TTL size: ${ttlSize} bytes)`);
      console.log(`${LOG_PREFIX} Step 2 completed: TTL content is ${ttlSize} bytes`, metadataInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      steps[1] = updateStep(steps[1], "failed", `Failed to prepare metadata: ${errorMessage}`);
      console.error(`${LOG_PREFIX} Step 2 failed:`, errorMessage);

      return {
        success: false,
        graphId,
        dkgAssetUAL: "",
        steps,
      };
    }

    // -------------------------------------------------------------------------
    // Step 3: POST raw TTL to MFSSIA API /api/rdf
    // -------------------------------------------------------------------------
    steps[2] = updateStep(steps[2], "in_progress", "Posting TTL content to MFSSIA API...");
    const mfssiaApiUrl = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
    console.log(`${LOG_PREFIX} Step 3: POSTing TTL to ${mfssiaApiUrl}/api/rdf`);

    try {
      const response = await fetch(`${mfssiaApiUrl}/api/rdf`, {
        method: "POST",
        headers: { "Content-Type": "text/turtle" },
        body: resolvedTtlContent,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `MFSSIA API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`,
        );
      }

      const result = await response.json();
      console.log(`${LOG_PREFIX} MFSSIA API response:`, JSON.stringify(result));

      // The MFSSIA /api/rdf response wraps data in { success, data: { status, bytes, ... } }
      const data = result.data || result;

      // Extract UAL - check multiple possible locations in the response
      dkgAssetUAL =
        data.ual ||
        data.UAL ||
        data.assetUAL ||
        result.ual ||
        result.UAL ||
        result.assetUAL ||
        data.id ||
        data.assetId ||
        "";

      if (dkgAssetUAL) {
        steps[2] = updateStep(steps[2], "completed", `Published to DKG. UAL: ${dkgAssetUAL}`);
        console.log(`${LOG_PREFIX} Step 3 completed: UAL = ${dkgAssetUAL}`);
      } else {
        // API accepted the TTL but did not return a UAL
        // DKG Knowledge Asset creation may happen asynchronously on the server
        steps[2] = updateStep(
          steps[2],
          "completed",
          `TTL ingested by MFSSIA (${data.bytes || resolvedTtlContent.length} bytes). UAL not yet assigned - DKG asset creation may be asynchronous.`,
        );
        console.log(
          `${LOG_PREFIX} Step 3 completed: TTL ingested, no UAL returned yet. Response:`,
          JSON.stringify(data),
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      steps[2] = updateStep(steps[2], "failed", `MFSSIA API submission failed: ${errorMessage}`);
      console.error(`${LOG_PREFIX} Step 3 failed:`, errorMessage);

      return {
        success: false,
        graphId,
        dkgAssetUAL: "",
        steps,
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: On-chain recording note (done from frontend via wagmi)
    // -------------------------------------------------------------------------
    if (dkgAssetUAL) {
      steps[3] = updateStep(
        steps[3],
        "completed",
        `On-chain recording available: markRDFGraphPublished(${graphId.slice(0, 10)}..., ${dkgAssetUAL.slice(0, 30)}...)`,
      );
    } else {
      steps[3] = updateStep(steps[3], "completed", `On-chain recording deferred until UAL is assigned by MFSSIA/DKG.`);
    }
    console.log(`${LOG_PREFIX} Step 4: On-chain recording will be triggered from frontend via wagmi`);

    // -------------------------------------------------------------------------
    // Success
    // -------------------------------------------------------------------------
    console.log(`${LOG_PREFIX} Publish workflow completed successfully for graphId ${graphId}`);

    return {
      success: true,
      graphId,
      dkgAssetUAL,
      steps,
    };
  }

  /**
   * Check whether the DKG Publisher is currently enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let dkgPublisherServiceInstance: DKGPublisherService | null = null;

export function getDKGPublisherService(): DKGPublisherService {
  if (!dkgPublisherServiceInstance) {
    dkgPublisherServiceInstance = new DKGPublisherService();
  }
  return dkgPublisherServiceInstance;
}
