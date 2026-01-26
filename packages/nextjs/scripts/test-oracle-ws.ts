/**
 * Minimal Oracle WebSocket test client
 * Based on the MFSSIA reference implementation
 *
 * Usage: npx ts-node scripts/test-oracle-ws.ts <instanceId>
 *
 * This connects to the Oracle WebSocket, subscribes to an instance,
 * and logs ALL events received. Use this to verify if the server
 * actually sends verification events.
 */
import { Socket, io } from "socket.io-client";

const SERVER_URL = "https://api.dymaxion-ou.co";
const WS_PATH = "/ws/oracle";
const instanceId = process.argv[2] || "test-instance";

console.log("=== MFSSIA Oracle WebSocket Test ===");
console.log("Server:", SERVER_URL);
console.log("Path:", WS_PATH);
console.log("Instance ID:", instanceId);
console.log("====================================\n");

const socket: Socket = io(SERVER_URL, {
  path: WS_PATH,
  transports: ["websocket"],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

// Connection
socket.on("connect", () => {
  console.log(`[${ts()}] CONNECTED (socketId: ${socket.id})`);
  console.log(`[${ts()}] Subscribing to instance: ${instanceId}`);
  socket.emit("oracle.subscribe", { instanceId });
});

socket.on("disconnect", reason => {
  console.log(`[${ts()}] DISCONNECTED: ${reason}`);
});

socket.on("connect_error", (err: any) => {
  console.error(`[${ts()}] CONNECT ERROR: ${err.message}`);
});

// Oracle events (dot notation)
socket.on("oracle.subscribed", data => {
  console.log(`[${ts()}] SUBSCRIBED:`, JSON.stringify(data));
});

socket.on("oracle.verification.requested", data => {
  console.log(`[${ts()}] VERIFICATION REQUESTED:`, JSON.stringify(data));
});

socket.on("oracle.verification.processing", data => {
  console.log(`[${ts()}] VERIFICATION PROCESSING:`, JSON.stringify(data));
});

socket.on("oracle.verification.success", data => {
  console.log(`[${ts()}] VERIFICATION SUCCESS:`, JSON.stringify(data));
});

socket.on("oracle.verification.failed", data => {
  console.log(`[${ts()}] VERIFICATION FAILED:`, JSON.stringify(data));
});

socket.on("oracle.verification.error", data => {
  console.log(`[${ts()}] VERIFICATION ERROR:`, JSON.stringify(data));
});

// Oracle events (underscore notation)
socket.on("oracle_connected", data => {
  console.log(`[${ts()}] ORACLE CONNECTED:`, JSON.stringify(data));
});

// Catch-all: log EVERY event
socket.onAny((eventName: string, ...args: any[]) => {
  console.log(`[${ts()}] RAW EVENT: "${eventName}"`, JSON.stringify(args));
});

function ts(): string {
  return new Date().toISOString().split("T")[1].slice(0, 12);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n[${ts()}] Shutting down...`);
  socket.disconnect();
  process.exit(0);
});

console.log(`[${ts()}] Connecting to ${SERVER_URL}...`);
console.log("Press Ctrl+C to exit.\n");
