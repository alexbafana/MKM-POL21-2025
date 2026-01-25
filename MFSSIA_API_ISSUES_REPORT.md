# MFSSIA API Issues Report

**Date:** January 8, 2026
**Reporter:** MKMPOL21 DAO Development Team
**Severity:** Critical - Blocks Production Deployment
**Components Affected:** Oracle WebSocket Gateway, Challenge Instance API

---

## Executive Summary

We have identified two critical issues with the MFSSIA API that are blocking our production deployment:

1. **WebSocket Connection Failure**: Unable to connect to the Oracle WebSocket Gateway at `wss://api.dymaxion-ou.co/ws/oracle`
2. **GET Challenge Instance 500 Error**: The endpoint `GET /api/challenge-instances/{id}` consistently returns HTTP 500 Internal Server Error

These issues, combined with the previously reported oracle attestation creation issue, completely block the user onboarding flow.

---

## Issue 1: WebSocket Connection Failure

### Description

When attempting to connect to the MFSSIA Oracle WebSocket Gateway using the Socket.IO client, the connection fails with a "websocket error".

### Error Message

```
ERROR: Failed to connect to Oracle Gateway: websocket error
```

### Configuration Used

We followed the MFSSIA documentation exactly:

```javascript
// From MFSSIA_WEBSOCKET_INTEGRATION_PLAN.md lines 237-244
const socket = io('wss://api.dymaxion-ou.co/ws/oracle', {
  path: '/ws/oracle',
  transports: ['websocket'],
});
```

### Analysis

The MFSSIA documentation specifies an unusual Socket.IO configuration where BOTH:
- The URL includes `/ws/oracle` as the namespace
- The `path` option is also set to `/ws/oracle`

In standard Socket.IO:
- URL path = Socket.IO namespace (e.g., `/ws/oracle`)
- `path` option = Engine.IO HTTP endpoint (defaults to `/socket.io/`)

This configuration suggests the MFSSIA server uses `/ws/oracle` as BOTH the namespace AND the engine.io path, which is non-standard.

### Possible Causes

1. **Server Not Running**: The WebSocket server at `wss://api.dymaxion-ou.co/ws/oracle` may not be active
2. **Wrong Path Configuration**: The server may expect a different path configuration
3. **CORS Issues**: The server may not accept connections from our origin
4. **Protocol Mismatch**: Server may use plain WebSocket instead of Socket.IO protocol
5. **TLS/SSL Issues**: Certificate problems on the WebSocket endpoint

### Verification Request

Please confirm:
1. Is the WebSocket server running at `wss://api.dymaxion-ou.co/ws/oracle`?
2. Does the server use Socket.IO protocol or plain WebSocket?
3. What is the correct Socket.IO configuration (path, transports)?
4. Are there any CORS restrictions on the WebSocket endpoint?
5. What origins are allowed to connect?

### Our Implementation

File: `packages/nextjs/services/MFSSIAWebSocketService.ts`

```typescript
const wsUrl = `${this.baseUrl}/ws/oracle`;  // https://api.dymaxion-ou.co/ws/oracle

this.socket = io(wsUrl, {
  path: '/ws/oracle',           // As specified in MFSSIA docs
  transports: ['websocket'],    // As specified in MFSSIA docs
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 30000,
  autoConnect: true,
  forceNew: true,
});
```

---

## Issue 2: GET Challenge Instance Returns 500 Error

### Description

The endpoint `GET /api/challenge-instances/{id}` consistently returns HTTP 500 Internal Server Error for valid challenge instance IDs.

### Test Case

**Request:**
```http
GET https://api.dymaxion-ou.co/api/challenge-instances/d56b03a3-cf72-421a-ad89-fccec2940c79
Content-Type: application/json
```

**Response:**
```json
HTTP/1.1 500 Internal Server Error
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

### Reproduction Steps

1. Create a new challenge instance via `POST /api/challenge-instances`:
   ```bash
   curl -X POST https://api.dymaxion-ou.co/api/challenge-instances \
     -H "Content-Type: application/json" \
     -d '{"did":"did:web:mkmpol21:0xTEST", "challengeSet":"mfssia:Example-U"}'
   ```

   Response includes `id: "d56b03a3-cf72-421a-ad89-fccec2940c79"`

2. Immediately try to GET the instance:
   ```bash
   curl https://api.dymaxion-ou.co/api/challenge-instances/d56b03a3-cf72-421a-ad89-fccec2940c79
   ```

   Response: 500 Internal Server Error

### Impact

This endpoint is used to:
- Check challenge instance state before evidence submission
- Determine if instance is `IN_PROGRESS`, `VERIFIED`, or `COMPLETED`
- Debug onboarding flow issues

Without it, we cannot properly handle auto-verified instances or check submission state.

### Workaround Implemented

We added error handling to gracefully skip this check:

```typescript
// MFSSIAService.ts
async getChallengeInstance(instanceId: string): Promise<ChallengeInstanceResponse> {
  try {
    const response = await this.request<any>(endpoint);
    return this.unwrapResponse<ChallengeInstanceResponse>(response);
  } catch (error: any) {
    if (error.message?.includes('500') || error.message?.includes('502')) {
      throw new Error(
        `MFSSIA API error retrieving challenge instance. ` +
        `This is a known issue with the MFSSIA API. ` +
        `Original error: ${error.message}`
      );
    }
    throw error;
  }
}
```

---

## Issue 3: Oracle Not Creating Attestations (Previously Reported)

### Summary

The `mfssia:Example-U` challenge set creates instances with `state: "VERIFIED"` immediately, but the oracle service never creates attestations for them.

This was documented in `MFSSIA_BUG_REPORT.md` on January 3, 2026.

### Current Status

- **Still unresolved**
- Blocks user onboarding
- Combined with WebSocket failure, we have no way to receive attestations

---

## Combined Impact Assessment

### Blocked Functionality

| Feature | Status | Blocker |
|---------|--------|---------|
| DID Registration | Working | - |
| Challenge Instance Creation | Working | - |
| Evidence Submission | Blocked | Instance state can't be verified (Issue 2) |
| Oracle Verification via WebSocket | Blocked | Can't connect (Issue 1) |
| Attestation Retrieval | Blocked | Oracle doesn't create attestations (Issue 3) |
| User Onboarding | **Completely Blocked** | All issues combined |

### User Flow Breakdown

```
Step 1: Register DID           → SUCCESS
Step 2: Create Challenge       → SUCCESS (but state="VERIFIED")
Step 3: Check Instance State   → FAILS (500 error)
Step 4: Connect to WebSocket   → FAILS (websocket error)
Step 5: Submit Evidence        → BLOCKED (can't verify state first)
Step 6: Wait for Oracle        → BLOCKED (no WebSocket, no oracle processing)
Step 7: Get Attestation        → BLOCKED (oracle never creates one)
Step 8: Assign Role            → BLOCKED (no attestation)
```

---

## Environment Details

### Client Configuration

```
Platform: MKMPOL21 DAO (Next.js 15)
Socket.IO Client: socket.io-client ^4.x
MFSSIA API URL: https://api.dymaxion-ou.co
MFSSIA WebSocket: wss://api.dymaxion-ou.co/ws/oracle
Challenge Set: mfssia:Example-U
```

### Network Details

```
Client Origin: http://localhost:3000 (development)
Browser: Chrome 131 / Firefox 134
Node.js: v20.18+
```

---

## Requested Actions

### Priority 1: WebSocket Server Status

1. Confirm if WebSocket server is operational
2. Provide correct Socket.IO configuration
3. Test and verify connection from external client

### Priority 2: Fix GET Challenge Instance Endpoint

1. Investigate 500 error cause
2. Fix server-side bug
3. Return proper instance data or meaningful error

### Priority 3: Oracle Attestation Creation

1. Configure oracle to process auto-verified instances
2. OR disable auto-verification for mfssia:Example-U
3. Ensure attestations are created within 10 seconds of verification

---

## Verification Tests After Fix

### Test 1: WebSocket Connection

```javascript
const socket = io('wss://api.dymaxion-ou.co/ws/oracle', {
  path: '/ws/oracle',
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('SUCCESS: Connected with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('FAILURE:', error.message);
});
```

**Expected:** Connection succeeds, `oracle.connected` event received

### Test 2: GET Challenge Instance

```bash
# Create instance
INSTANCE_ID=$(curl -s -X POST https://api.dymaxion-ou.co/api/challenge-instances \
  -H "Content-Type: application/json" \
  -d '{"did":"did:web:test:verify", "challengeSet":"mfssia:Example-U"}' \
  | jq -r '.data.id')

# Get instance
curl https://api.dymaxion-ou.co/api/challenge-instances/$INSTANCE_ID
```

**Expected:** HTTP 200 with instance data including `id`, `state`, `nonce`, etc.

### Test 3: Attestation Creation

```bash
# After creating instance, wait 10 seconds
sleep 10

# Check for attestation
curl https://api.dymaxion-ou.co/api/attestations/did/did:web:test:verify
```

**Expected:** HTTP 200 with attestation including `ual` field

---

## Contact Information

**Project:** MKMPOL21 DAO - Public Data Governance Platform
**Integration:** MFSSIA for decentralized identity verification
**Environment:** Production API (api.dymaxion-ou.co)

**Related Documentation:**
- `MFSSIA_BUG_REPORT.md` - Original oracle attestation issue
- `MFSSIA_WEBSOCKET_INTEGRATION_PLAN.md` - Our integration implementation
- `MFSSIA_API_REFERENCE.md` - API documentation summary
- `packages/nextjs/services/MFSSIAWebSocketService.ts` - WebSocket implementation
- `packages/nextjs/services/MFSSIAService.ts` - API client implementation

---

## Timeline

| Date | Event |
|------|-------|
| 2026-01-02 | Challenges C-U-1, C-U-2 created |
| 2026-01-03 | Discovered oracle not creating attestations |
| 2026-01-03 | `MFSSIA_BUG_REPORT.md` submitted |
| 2026-01-08 | Discovered WebSocket connection failure |
| 2026-01-08 | Discovered GET challenge instance 500 error |
| 2026-01-08 | This comprehensive report created |

---

## Appendix A: Full Error Logs

### WebSocket Connection Error

```
[MFSSIA WS] Service initialized with base URL: https://api.dymaxion-ou.co
[MFSSIA WS] Connecting to Oracle Gateway...
[MFSSIA WS] Base URL: https://api.dymaxion-ou.co
[MFSSIA WS] Connecting to: https://api.dymaxion-ou.co/ws/oracle
[MFSSIA WS] Using path option: /ws/oracle (as per MFSSIA docs)
[MFSSIA WS] Transport: websocket only (as per MFSSIA docs)
[MFSSIA WS] ============ CONNECTION ERROR ============
[MFSSIA WS] Error message: websocket error
[MFSSIA WS] Connection attempt URL: https://api.dymaxion-ou.co/ws/oracle
[MFSSIA WS] Socket.IO path option: /ws/oracle
[MFSSIA WS] ==========================================
ERROR: Failed to connect to Oracle Gateway: websocket error
```

### GET Challenge Instance Error

```
[MFSSIA] GET /api/challenge-instances/d56b03a3-cf72-421a-ad89-fccec2940c79
MFSSIA API Error [/api/challenge-instances/d56b03a3-cf72-421a-ad89-fccec2940c79]:
  HTTP 500: Internal server error
[MFSSIA] getChallengeInstance failed for d56b03a3-cf72-421a-ad89-fccec2940c79:
  [/api/challenge-instances/d56b03a3-cf72-421a-ad89-fccec2940c79] HTTP 500: Internal server error
```

---

**End of Report**
