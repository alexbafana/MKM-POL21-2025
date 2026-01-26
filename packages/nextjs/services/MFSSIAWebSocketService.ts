/**
 * MFSSIA WebSocket Service
 * Manages real-time WebSocket connection to the MFSSIA Oracle Gateway
 * Provides event-based verification status updates during onboarding
 */
import { Socket, io } from "socket.io-client";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Connection states for the WebSocket
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

/**
 * Oracle event types emitted by the MFSSIA WebSocket gateway
 */
export type OracleEvent =
  | "oracle.connected"
  | "oracle_connected"
  | "oracle.subscribed"
  | "oracle.error"
  | "oracle.verification.requested"
  | "oracle.verification.processing"
  | "oracle.verification.success"
  | "oracle.verification.failed"
  | "oracle.verification.error";

/**
 * Payload for oracle.connected event
 */
export interface OracleConnectedPayload {
  socketId: string;
  timestamp?: string;
}

/**
 * Payload for oracle.subscribed event (subscription acknowledgement)
 */
export interface OracleSubscribedPayload {
  instanceId: string;
  timestamp?: string;
}

/**
 * Payload for oracle.error event (general oracle errors)
 */
export interface OracleGeneralErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
}

/**
 * Payload for oracle.verification.requested event
 */
export interface OracleRequestedPayload {
  instanceId: string;
  verificationInstanceId?: string;
  timestamp: string;
}

/**
 * Payload for oracle.verification.processing event
 */
export interface OracleProcessingPayload {
  instanceId: string;
  verificationInstanceId?: string;
  timestamp: string;
  step?: string;
  progress?: number;
}

/**
 * Payload for oracle.verification.success event
 */
export interface OracleSuccessPayload {
  instanceId?: string;
  verificationInstanceId?: string;
  requestId?: string;
  finalResult?: boolean;
  passedChallenges?: string[];
  confidence: number;
  ual?: string;
  timestamp: string;
  // Updated server nests data under `result`
  result?: {
    finalResult?: string | boolean;
    aggregateConfidence?: number;
    passedChallenges?: string[];
    rawResponse?: string;
    ual?: string;
  };
}

/**
 * Payload for oracle.verification.failed event
 */
export interface OracleFailedPayload {
  instanceId?: string;
  verificationInstanceId?: string;
  requestId?: string;
  finalResult?: false | string;
  passedChallenges?: string[];
  failedChallenges?: string[];
  confidence: number;
  reason?: string;
  message?: string;
  error?: string;
  timestamp: string;
  // Updated server nests data under `result`
  result?: {
    finalResult?: string | boolean;
    aggregateConfidence?: number;
    passedChallenges?: string[];
    failedChallenges?: string[];
    rawResponse?: string;
    reason?: string;
  };
}

/**
 * Payload for oracle.verification.error event
 */
export interface OracleErrorPayload {
  instanceId: string;
  verificationInstanceId?: string;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Union type for all oracle event payloads
 */
export type OracleEventPayload =
  | OracleConnectedPayload
  | OracleSubscribedPayload
  | OracleGeneralErrorPayload
  | OracleRequestedPayload
  | OracleProcessingPayload
  | OracleSuccessPayload
  | OracleFailedPayload
  | OracleErrorPayload;

/**
 * Event handler function type
 */
export type OracleEventHandler<T = OracleEventPayload> = (data: T) => void;

// ============================================================================
// WebSocket Service Class
// ============================================================================

/**
 * MFSSIAWebSocketService - Singleton service for managing WebSocket connections
 * to the MFSSIA Oracle Gateway.
 *
 * Features:
 * - Singleton pattern for connection management
 * - Automatic reconnection with exponential backoff
 * - Type-safe event handling
 * - Connection state management
 * - Instance subscription management
 * - Comprehensive error handling and logging
 */
export class MFSSIAWebSocketService {
  // Singleton instance
  private static instance: MFSSIAWebSocketService | null = null;

  // Socket.IO client instance
  private socket: Socket | null = null;

  // Base URL for WebSocket connection
  private baseUrl: string;

  // Current connection state
  private connectionState: ConnectionState = "disconnected";

  // Map of event handlers: event name -> Set of callback functions
  private eventHandlers: Map<string, Set<OracleEventHandler>> = new Map();

  // Set of currently subscribed instance IDs
  private subscribedInstances: Set<string> = new Set();

  // Raw event handlers for catch-all event forwarding (used by UI event log)
  private rawEventHandlers: Set<(eventName: string, data: any) => void> = new Set();

  // Connection timeout (ms)
  private connectionTimeout: number = 30000;

  // Last error for debugging
  private lastError: Error | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Get base URL from environment or use default
    this.baseUrl =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_MFSSIA_API_URL || "https://api.dymaxion-ou.co"
        : process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";

    console.log("[MFSSIA WS] Service initialized with base URL:", this.baseUrl);
  }

  /**
   * Get the singleton instance of the WebSocket service
   */
  static getInstance(): MFSSIAWebSocketService {
    if (!this.instance) {
      this.instance = new MFSSIAWebSocketService();
    }
    return this.instance;
  }

  /**
   * Connect to the MFSSIA Oracle Gateway WebSocket
   * Returns a promise that resolves when connected or rejects on error
   *
   * Socket.IO configuration notes (from MFSSIA documentation):
   * ============================================================
   *
   * The MFSSIA docs specify this exact configuration:
   *   const socket = io('wss://<backend-domain>/ws/oracle', {
   *     path: '/ws/oracle',
   *     transports: ['websocket'],
   *   });
   *
   * This is unusual because it specifies BOTH the URL path AND the path option.
   * In standard Socket.IO:
   * - URL path = namespace (e.g., /ws/oracle namespace)
   * - path option = engine.io HTTP endpoint (defaults to /socket.io/)
   *
   * The MFSSIA configuration suggests their server uses /ws/oracle as BOTH:
   * 1. The namespace path in the URL
   * 2. The engine.io path (not /socket.io/)
   *
   * We implement EXACTLY as their documentation specifies, even though it's redundant.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket?.connected) {
        console.log("[MFSSIA WS] Already connected, reusing connection");
        resolve();
        return;
      }

      // Update connection state
      this.connectionState = "connecting";
      console.log("[MFSSIA WS] Connecting to Oracle Gateway...");
      console.log("[MFSSIA WS] Base URL:", this.baseUrl);

      // Local flag to ensure the promise is settled exactly once
      let settled = false;

      // Set up connection timeout
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.connectionState = "error";
          const error = new Error(`WebSocket connection timeout after ${this.connectionTimeout}ms`);
          this.lastError = error;
          console.error("[MFSSIA WS] Connection timeout");
          reject(error);
        }
      }, this.connectionTimeout);

      try {
        // Create Socket.IO connection
        //
        // CRITICAL: Socket.IO configuration for MFSSIA Oracle Gateway
        //
        // The reference client from MFSSIA team uses:
        //   io(SERVER_URL, { path: WS_PATH, transports: ['websocket'] })
        //   where SERVER_URL = 'https://api.dymaxion-ou.co' (NO namespace in URL)
        //   and WS_PATH = '/ws/oracle' (Engine.IO path, not namespace)
        //
        // This means:
        //   - Base URL: https://api.dymaxion-ou.co (root, no namespace)
        //   - Engine.IO path: /ws/oracle (NOT the default /socket.io/)
        //   - Namespace: default '/' namespace
        //
        // DO NOT append /ws/oracle to the URL - that would create an invalid namespace!

        const wsUrl = this.baseUrl; // Just the base URL, no path appended
        console.log("[MFSSIA WS] Connecting to:", wsUrl);
        console.log("[MFSSIA WS] Using Engine.IO path: /ws/oracle");
        console.log("[MFSSIA WS] Transport: websocket only");

        // Guard: skip socket re-creation if socket already exists but is disconnecting/reconnecting
        if (this.socket && !this.socket.connected) {
          console.log("[MFSSIA WS] Socket exists but not connected, reusing existing socket");
          this.socket.connect();
          return;
        }

        this.socket = io(wsUrl, {
          // Engine.IO endpoint is /ws/oracle, not /socket.io/
          // This is the HTTP path for the upgrade handshake, NOT a namespace
          path: "/ws/oracle",
          // MFSSIA docs specify websocket only, no polling fallback
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: Infinity,
          timeout: 20000,
          autoConnect: true,
        });

        // Connection established handler
        this.socket.on("connect", () => {
          clearTimeout(timeoutId);
          console.log("[MFSSIA WS] Connected successfully:", this.socket?.id);
          this.connectionState = "connected";
          this.lastError = null;

          // Emit internal connected event
          this.emit("oracle.connected", { socketId: this.socket?.id || "" });

          if (!settled) {
            settled = true;
            resolve();
          }
        });

        // Disconnection handler
        this.socket.on("disconnect", reason => {
          console.log("[MFSSIA WS] Disconnected:", reason);
          this.connectionState = "disconnected";

          // If disconnected unexpectedly, socket.io will auto-reconnect
          if (reason === "io server disconnect") {
            // Server initiated disconnect, need to manually reconnect
            console.log("[MFSSIA WS] Server initiated disconnect, attempting reconnect...");
            this.socket?.connect();
          }
        });

        // Connection error handler
        this.socket.on("connect_error", error => {
          clearTimeout(timeoutId);

          // Extract comprehensive error information
          const errorInfo = {
            message: error.message,
            name: error.name,
            type: (error as any).type,
            description: (error as any).description,
            context: (error as any).context,
            code: (error as any).code,
            data: (error as any).data,
            req: (error as any).req
              ? {
                  method: (error as any).req?.method,
                  url: (error as any).req?.url,
                  headers: (error as any).req?.headers,
                }
              : undefined,
            // Socket.IO specific error properties
            transport: (error as any).transport,
            // HTTP response details if available
            response: (error as any).response
              ? {
                  status: (error as any).response?.status,
                  statusText: (error as any).response?.statusText,
                  headers: (error as any).response?.headers,
                }
              : undefined,
          };

          console.error("[MFSSIA WS] ============ CONNECTION ERROR ============");
          console.error("[MFSSIA WS] Error message:", error.message);
          console.error("[MFSSIA WS] Full error object:", error);
          console.error("[MFSSIA WS] Error details:", JSON.stringify(errorInfo, null, 2));
          console.error("[MFSSIA WS] Stack trace:", error.stack);
          console.error("[MFSSIA WS] Connection attempt URL:", this.baseUrl);
          console.error("[MFSSIA WS] Socket.IO path option: /ws/oracle");
          console.error("[MFSSIA WS] ==========================================");

          this.connectionState = "error";
          this.lastError = error;

          // Provide helpful debugging info
          console.log("[MFSSIA WS] ---- Troubleshooting Tips ----");
          console.log("  1. Check if MFSSIA WebSocket server is running at wss://api.dymaxion-ou.co");
          console.log("  2. Verify the server supports Socket.IO protocol (not plain WebSocket)");
          console.log("  3. Check for CORS issues in browser console");
          console.log("  4. Ensure firewall allows WebSocket connections on port 443");
          console.log('  5. The Engine.IO path is "/ws/oracle" - verify server configuration matches');
          console.log('  6. If "websocket error", the WebSocket handshake may have failed');
          console.log("  7. Ensure NO namespace is appended to the URL (use base URL only)");
          console.log("");
          console.log("[MFSSIA WS] ---- Possible Server-Side Issues ----");
          console.log("  - Server may not have Socket.IO enabled on /ws/oracle endpoint");
          console.log("  - Server may expect different path configuration");
          console.log("  - Server may have CORS restrictions");
          console.log("  - Server may only accept specific origins");
          console.log("[MFSSIA WS] -------------------------------------");

          // Only reject if the promise hasn't been settled yet (initial connection attempt)
          if (!settled) {
            settled = true;
            reject(error);
          }
        });

        // Reconnection handlers (Socket.IO v4: reconnect events are on the Manager, not the Socket)
        this.socket.io.on("reconnect", attemptNumber => {
          console.log("[MFSSIA WS] Reconnected after", attemptNumber, "attempts");
          this.connectionState = "connected";
          this.lastError = null;

          // Re-subscribe to all previously subscribed instances
          this.resubscribeToInstances();
        });

        this.socket.io.on("reconnect_attempt", attemptNumber => {
          console.log("[MFSSIA WS] Reconnecting... attempt", attemptNumber);
          this.connectionState = "reconnecting";
        });

        this.socket.io.on("reconnect_error", error => {
          console.error("[MFSSIA WS] Reconnection error:", error.message);
          this.lastError = error;
        });

        this.socket.io.on("reconnect_failed", () => {
          console.error("[MFSSIA WS] Reconnection failed after max attempts");
          this.connectionState = "error";
          this.lastError = new Error("Reconnection failed after maximum attempts");
        });

        // Register oracle event handlers
        this.registerOracleEventHandlers();
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("[MFSSIA WS] Failed to create socket:", error);
        this.connectionState = "error";
        this.lastError = error instanceof Error ? error : new Error(String(error));
        if (!settled) {
          settled = true;
          reject(this.lastError);
        }
      }
    });
  }

  /**
   * Register handlers for all oracle events from the server
   */
  private registerOracleEventHandlers(): void {
    if (!this.socket) return;

    console.log("%c[MFSSIA WS] Registering oracle event handlers...", "color: #00bcd4");

    // Oracle subscription acknowledgement (confirms subscription was successful)
    this.socket.on("oracle.subscribed", (data: OracleSubscribedPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: SUBSCRIBED ==========",
        "background: #2196f3; color: #fff; font-size: 12px; padding: 2px;",
      );
      console.log("[MFSSIA WS] Subscribed to instance:", data.instanceId);
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.subscribed", data);
    });

    // Oracle general error (non-verification errors)
    // Server may use either `error` or `message` field depending on version
    this.socket.on("oracle.error", (data: OracleGeneralErrorPayload) => {
      const errorMsg = data.error || data.message || "Unknown error";
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: GENERAL ERROR ==========",
        "background: #e91e63; color: #fff; font-size: 12px; padding: 2px;",
      );
      console.error("[MFSSIA WS] Oracle Error:", errorMsg);
      console.error("[MFSSIA WS] Error Code:", data.code);
      console.error("[MFSSIA WS] Full data:", data);
      // Normalize: ensure `error` field is populated for downstream handlers
      this.emit("oracle.error", { ...data, error: errorMsg });
    });

    // Oracle verification requested
    this.socket.on("oracle.verification.requested", (data: OracleRequestedPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: REQUESTED ==========",
        "background: #ff9800; color: #000; font-size: 12px; padding: 2px;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.requested", data);
    });

    // Oracle verification processing
    this.socket.on("oracle.verification.processing", (data: OracleProcessingPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: PROCESSING ==========",
        "background: #ffeb3b; color: #000; font-size: 12px; padding: 2px;",
      );
      console.log("[MFSSIA WS] Step:", data.step);
      console.log("[MFSSIA WS] Progress:", data.progress);
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.processing", data);
    });

    // Oracle verification success
    this.socket.on("oracle.verification.success", (data: OracleSuccessPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: SUCCESS ==========",
        "background: #4caf50; color: #fff; font-size: 14px; padding: 4px;",
      );
      console.log("[MFSSIA WS] Instance ID:", data.instanceId);
      console.log("[MFSSIA WS] Final Result:", data.finalResult);
      console.log("[MFSSIA WS] Confidence:", data.confidence);
      console.log("[MFSSIA WS] Passed Challenges:", data.passedChallenges);
      console.log("[MFSSIA WS] UAL:", data.ual);
      console.log("[MFSSIA WS] Full data:", data);
      this.emit("oracle.verification.success", data);
    });

    // Oracle verification failed
    this.socket.on("oracle.verification.failed", (data: OracleFailedPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: FAILED ==========",
        "background: #f44336; color: #fff; font-size: 14px; padding: 4px;",
      );
      console.log("[MFSSIA WS] Reason:", data.reason);
      console.log("[MFSSIA WS] Failed Challenges:", data.failedChallenges);
      console.log("[MFSSIA WS] Full data:", data);
      this.emit("oracle.verification.failed", data);
    });

    // Oracle verification error
    this.socket.on("oracle.verification.error", (data: OracleErrorPayload) => {
      console.log(
        "%c[MFSSIA WS] ========== ORACLE EVENT: ERROR ==========",
        "background: #f44336; color: #fff; font-size: 14px; padding: 4px;",
      );
      console.error("[MFSSIA WS] Error:", data.error);
      console.error("[MFSSIA WS] Full data:", data);
      this.emit("oracle.verification.error", data);
    });

    // Listen for ALL events for comprehensive debugging and catch-all forwarding
    // This catches events even if their names are slightly different than expected
    this.socket.onAny((eventName: string, ...args: any[]) => {
      // Log ALL events with prominent styling for debugging
      console.log(
        "%c[MFSSIA WS] ========== RAW EVENT RECEIVED ==========",
        "background: #673ab7; color: #fff; font-size: 12px; padding: 2px;",
      );
      console.log("[MFSSIA WS] Event Name:", eventName);
      console.log("[MFSSIA WS] Event Args:", JSON.stringify(args, null, 2));
      console.log("[MFSSIA WS] Number of args:", args.length);

      // Forward ALL events to raw event handlers (for UI event log)
      const eventData = args[0] ?? {};
      this.rawEventHandlers.forEach(handler => {
        try {
          handler(eventName, eventData);
        } catch (err) {
          console.error(`[MFSSIA WS] Error in raw event handler for ${eventName}:`, err);
        }
      });

      // Check for verification events that might have different data shapes
      if (eventName.includes("verification") || eventName.includes("oracle")) {
        console.log("%c[MFSSIA WS] This is an oracle/verification event!", "color: #ff9800; font-weight: bold;");

        // Log detailed info about each argument
        args.forEach((arg, index) => {
          console.log(`[MFSSIA WS] Arg[${index}]:`, arg);
          if (typeof arg === "object" && arg !== null) {
            console.log(`[MFSSIA WS] Arg[${index}] keys:`, Object.keys(arg));
            console.log(`[MFSSIA WS] Arg[${index}] instanceId:`, arg.instanceId);
            console.log(`[MFSSIA WS] Arg[${index}] verificationInstanceId:`, arg.verificationInstanceId);
          }
        });

        // If it's a verification event and we have data, emit it to handlers
        // This handles cases where the event name is correct but structure differs
        if (args[0] && typeof args[0] === "object") {
          const data = args[0];

          // If instanceId is missing, try to use verificationInstanceId
          if (!data.instanceId && data.verificationInstanceId) {
            console.log("%c[MFSSIA WS] Mapping verificationInstanceId to instanceId", "color: #ff9800;");
            data.instanceId = data.verificationInstanceId;
          }

          // Emit to registered handlers if this looks like a verification event
          if (
            eventName === "oracle.verification.processing" ||
            eventName === "oracle.verification.success" ||
            eventName === "oracle.verification.failed" ||
            eventName === "oracle.verification.error" ||
            eventName === "oracle.verification.requested"
          ) {
            // Already handled by specific listeners, just log
            console.log("[MFSSIA WS] Event already has specific handler");
          }
        }
      }

      console.log("[MFSSIA WS] =========================================");
    });

    // Also listen for events without the 'oracle.' prefix (in case server uses different naming)
    this.socket.on("verification.processing", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== ALT EVENT: verification.processing ==========",
        "background: #ffeb3b; color: #000;",
      );
      console.log("[MFSSIA WS] Data:", data);
      // Normalize and emit
      this.emit("oracle.verification.processing", data);
    });

    this.socket.on("verification.success", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== ALT EVENT: verification.success ==========",
        "background: #4caf50; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.success", data);
    });

    this.socket.on("verification.failed", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== ALT EVENT: verification.failed ==========",
        "background: #f44336; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.failed", data);
    });

    this.socket.on("verification.error", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== ALT EVENT: verification.error ==========",
        "background: #f44336; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.error", data);
    });

    // CRITICAL: Server uses UNDERSCORES instead of DOTS in event names!
    // Listen for underscore versions: oracle_verification_processing, oracle_verification_success, etc.
    this.socket.on("oracle_subscribed", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_subscribed ==========",
        "background: #2196f3; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.subscribed", data);
    });

    this.socket.on("oracle_connected", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_connected ==========",
        "background: #2196f3; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.connected", data);
    });

    this.socket.on("oracle_error", (data: any) => {
      const errorMsg = data?.error || data?.message || "Unknown error";
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_error ==========",
        "background: #f44336; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.error", { ...data, error: errorMsg });
    });

    this.socket.on("oracle_verification_requested", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_verification_requested ==========",
        "background: #ff9800; color: #000;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.requested", data);
    });

    this.socket.on("oracle_verification_processing", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_verification_processing ==========",
        "background: #ffeb3b; color: #000;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.processing", data);
    });

    this.socket.on("oracle_verification_success", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_verification_success ==========",
        "background: #4caf50; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.success", data);
    });

    this.socket.on("oracle_verification_failed", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_verification_failed ==========",
        "background: #f44336; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.failed", data);
    });

    this.socket.on("oracle_verification_error", (data: any) => {
      console.log(
        "%c[MFSSIA WS] ========== UNDERSCORE EVENT: oracle_verification_error ==========",
        "background: #f44336; color: #fff;",
      );
      console.log("[MFSSIA WS] Data:", data);
      this.emit("oracle.verification.error", data);
    });

    console.log(
      "%c[MFSSIA WS] All oracle event handlers registered (including underscore and alt names)",
      "color: #00bcd4",
    );
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    console.log("[MFSSIA WS] Disconnecting...");

    // Clear subscribed instances
    this.subscribedInstances.clear();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = "disconnected";
    console.log("[MFSSIA WS] Disconnected");
  }

  /**
   * Subscribe to a verification instance to receive its events
   * @param instanceId The verification instance ID to subscribe to
   */
  subscribeToInstance(instanceId: string): void {
    if (!this.socket?.connected) {
      console.warn("%c[MFSSIA WS] Cannot subscribe: WebSocket not connected!", "color: #f44336");
      throw new Error("WebSocket not connected. Call connect() first.");
    }

    console.log(
      "%c[MFSSIA WS] ========== SUBSCRIBING TO INSTANCE ==========",
      "background: #2196f3; color: #fff; font-size: 12px; padding: 2px;",
    );
    console.log("[MFSSIA WS] Instance ID:", instanceId);
    console.log("[MFSSIA WS] Socket ID:", this.socket.id);
    console.log("[MFSSIA WS] Socket connected:", this.socket.connected);

    this.subscribedInstances.add(instanceId);

    // Send subscription message to server
    this.socket.emit("oracle.subscribe", { instanceId: instanceId });
    console.log("%c[MFSSIA WS] Subscription message sent!", "color: #4caf50");
    console.log("[MFSSIA WS] Currently subscribed instances:", Array.from(this.subscribedInstances));
  }

  /**
   * Unsubscribe from a verification instance
   * @param instanceId The verification instance ID to unsubscribe from
   */
  unsubscribeFromInstance(instanceId: string): void {
    console.log("[MFSSIA WS] Unsubscribing from instance:", instanceId);

    // Remove from local set
    this.subscribedInstances.delete(instanceId);

    // Send unsubscription message if connected
    if (this.socket?.connected) {
      this.socket.emit("oracle.unsubscribe", { instanceId: instanceId });
      console.log("[MFSSIA WS] Unsubscription sent for instance:", instanceId);
    }
  }

  /**
   * Re-subscribe to all previously subscribed instances after reconnection
   */
  private resubscribeToInstances(): void {
    if (this.subscribedInstances.size > 0) {
      console.log("[MFSSIA WS] Re-subscribing to", this.subscribedInstances.size, "instances");
      this.subscribedInstances.forEach(instanceId => {
        if (this.socket?.connected) {
          this.socket.emit("oracle.subscribe", { instanceId: instanceId });
          console.log("[MFSSIA WS] Re-subscribed to instance:", instanceId);
        }
      });
    }
  }

  /**
   * Register an event handler for a specific oracle event
   * @param event The oracle event type to listen for
   * @param callback The callback function to execute when the event occurs
   */
  on<T = OracleEventPayload>(event: OracleEvent, callback: OracleEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback as OracleEventHandler);
    console.log("[MFSSIA WS] Registered handler for event:", event);
  }

  /**
   * Remove an event handler for a specific oracle event
   * @param event The oracle event type
   * @param callback The callback function to remove
   */
  off<T = OracleEventPayload>(event: OracleEvent, callback: OracleEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback as OracleEventHandler);
      console.log("[MFSSIA WS] Removed handler for event:", event);
    }
  }

  /**
   * Remove all event handlers for a specific event, or all events if no event specified
   * @param event Optional event to clear handlers for
   */
  offAll(event?: OracleEvent): void {
    if (event) {
      this.eventHandlers.delete(event);
      console.log("[MFSSIA WS] Cleared all handlers for event:", event);
    } else {
      this.eventHandlers.clear();
      this.rawEventHandlers.clear();
      console.log("[MFSSIA WS] Cleared all event handlers (including raw)");
    }
  }

  /**
   * Register a catch-all event handler that receives ALL WebSocket events
   * Useful for UI event logging
   * @param handler Callback receiving (eventName, data) for every event
   */
  onAnyEvent(handler: (eventName: string, data: any) => void): void {
    this.rawEventHandlers.add(handler);
    console.log("[MFSSIA WS] Registered raw event handler (total:", this.rawEventHandlers.size, ")");
  }

  /**
   * Remove a catch-all event handler
   * @param handler The handler to remove
   */
  offAnyEvent(handler: (eventName: string, data: any) => void): void {
    this.rawEventHandlers.delete(handler);
    console.log("[MFSSIA WS] Removed raw event handler (remaining:", this.rawEventHandlers.size, ")");
  }

  /**
   * Emit an event to all registered handlers
   * @param event The oracle event type
   * @param data The event payload data
   */
  private emit(event: OracleEvent, data: OracleEventPayload): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers && handlers.size > 0) {
      console.log("[MFSSIA WS] Emitting event:", event, "to", handlers.size, "handlers");
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MFSSIA WS] Error in event handler for ${event}:`, error);
        }
      });
    } else {
      console.log("[MFSSIA WS] No handlers registered for event:", event);
    }
  }

  /**
   * Check if the WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get the last error that occurred
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get the set of currently subscribed instance IDs
   */
  getSubscribedInstances(): Set<string> {
    return new Set(this.subscribedInstances);
  }

  /**
   * Get the socket ID if connected
   */
  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  /**
   * Cleanup and destroy the service instance
   * Use this when completely done with the service (e.g., app unmount)
   */
  static destroy(): void {
    if (this.instance) {
      this.instance.disconnect();
      this.instance.offAll();
      this.instance = null;
      console.log("[MFSSIA WS] Service instance destroyed");
    }
  }
}

// ============================================================================
// Singleton Export Helper
// ============================================================================

/**
 * Get the MFSSIA WebSocket service singleton instance
 * Convenience function for importing
 */
export const getMFSSIAWebSocket = (): MFSSIAWebSocketService => {
  return MFSSIAWebSocketService.getInstance();
};

export default MFSSIAWebSocketService;
