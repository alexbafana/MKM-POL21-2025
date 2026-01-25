# MFSSIA Oracle Subsystem - Diagnostic Plan

**Prepared for:** MFSSIA Team (Dymaxion OU)
**Prepared by:** MKM-POL21 DAO Integration Team
**Date:** 2026-01-19
**Priority:** HIGH - Blocking Production Integration

---

## Executive Summary

During end-to-end integration testing of the MFSSIA API (`https://api.dymaxion-ou.co`), we discovered that the **Oracle verification subsystem is not processing verification requests**. All API endpoints function correctly up to evidence submission, but the Oracle never completes verification, leaving challenge instances permanently stuck in `VERIFICATION_IN_PROGRESS` state.

**Impact:** No attestations can be created, blocking all identity verification workflows.

---

## Problem Statement

### Observed Behavior

| Step | Expected | Actual |
|------|----------|--------|
| DID Registration | Success | ✅ Works |
| Challenge Instance Creation | Success | ✅ Works |
| WebSocket Connection | Connected | ✅ Works |
| Evidence Submission | Success | ✅ Works (all 6 challenges) |
| Oracle Processing | Events emitted | ❌ **No events after `oracle.subscribed`** |
| Instance State Transition | `VERIFIED` or `FAILED` | ❌ **Stuck in `VERIFICATION_IN_PROGRESS`** |
| Attestation Creation | Attestation with UAL | ❌ **Never created** |

### WebSocket Events Received

```
✅ oracle_connected (immediately on connect)
✅ oracle.subscribed (after subscribing to instance)
❌ oracle.verification.requested (NEVER received)
❌ oracle.verification.processing (NEVER received)
❌ oracle.verification.success (NEVER received)
❌ oracle.verification.failed (NEVER received)
```

### Test Instance Details

```json
{
  "challengeInstanceId": "d3d5c984-7dad-4a74-b6e9-241fa27b5c1a",
  "challengeSet": "mfssia:Example-A",
  "state": "VERIFICATION_IN_PROGRESS",
  "stateAfter3Minutes": "VERIFICATION_IN_PROGRESS",
  "evidenceCount": 6,
  "attestationCreated": false
}
```

---

## Root Cause Analysis

Based on analysis of the MFSSIA reference implementation (`mfssia-ehealth` source code), the verification flow requires:

1. **ChallengeEvidenceService** → calls `triggerOracleVerification()`
2. **OracleVerificationService** → calls smart contract `requestVerification()`
3. **Chainlink Functions DON** → executes off-chain computation
4. **Smart Contract Callback** → emits `VerificationResponseReceived` event
5. **OracleListenerService** → detects event, creates attestation, emits WebSocket events

**The break occurs between steps 2-5.** Evidence is saved, but no downstream processing occurs.

---

## Diagnostic Checklist

### 1. OracleListenerService Health Check

**File:** `src/providers/oracle/listeners/oracle-listener.service.ts`

The `OracleListenerService` must be running and connected to the blockchain to receive `VerificationResponseReceived` events.

#### 1.1 Check Service Initialization

```bash
# Check if the service started successfully in logs
grep -i "OracleListenerService" /var/log/mfssia/*.log
grep -i "startListening" /var/log/mfssia/*.log
```

**Expected log output:**
```
[OracleListenerService] Listening for VerificationResponseReceived events...
```

#### 1.2 Verify Blockchain Connection

The service uses either WebSocket or JSON-RPC to connect:

```typescript
// From reference implementation
const url = wsUrl || rpcUrl;
const isWs = url.startsWith('wss://');

this.provider = isWs
  ? new ethers.WebSocketProvider(url)
  : new ethers.JsonRpcProvider(rpcUrl);
```

**Check connection status:**

```bash
# Check if WebSocket connection is established
netstat -an | grep -E "(8545|8546|443)" | grep ESTABLISHED

# Check for connection errors in logs
grep -iE "(connection|disconnect|timeout|ECONNREFUSED)" /var/log/mfssia/*.log
```

#### 1.3 Test Provider Connectivity Manually

```javascript
// Run this script on the MFSSIA server
const { ethers } = require('ethers');

const wsUrl = process.env.BLOCKCHAIN_WS_URL;
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

async function testConnection() {
  try {
    const provider = wsUrl
      ? new ethers.WebSocketProvider(wsUrl)
      : new ethers.JsonRpcProvider(rpcUrl);

    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected! Current block: ${blockNumber}`);

    // Test event subscription
    provider.on('block', (block) => {
      console.log(`📦 New block: ${block}`);
    });

  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
  }
}

testConnection();
```

#### 1.4 Check Environment Variables

```bash
# Verify blockchain config is set
echo "BLOCKCHAIN_RPC_URL: $BLOCKCHAIN_RPC_URL"
echo "BLOCKCHAIN_WS_URL: $BLOCKCHAIN_WS_URL"
echo "ORACLE_CONSUMER_ADDRESS: $ORACLE_CONSUMER_ADDRESS"
```

**Required variables:**
- `BLOCKCHAIN_RPC_URL` - JSON-RPC endpoint (e.g., `https://polygon-mainnet.infura.io/v3/...`)
- `BLOCKCHAIN_WS_URL` - WebSocket endpoint (e.g., `wss://polygon-mainnet.infura.io/ws/v3/...`)
- `ORACLE_CONSUMER_ADDRESS` - Deployed `MfssiaOracleConsumer` contract address

---

### 2. Chainlink Functions Configuration

#### 2.1 Check Subscription Status

The Chainlink Functions subscription must be active and funded.

```javascript
// Check subscription on Chainlink Functions UI or via script
const { ethers } = require('ethers');

const ROUTER_ADDRESS = '0x...'; // Chainlink Functions Router
const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID;

async function checkSubscription() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

  const routerAbi = [
    'function getSubscription(uint64 subscriptionId) view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)'
  ];

  const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, provider);

  try {
    const sub = await router.getSubscription(SUBSCRIPTION_ID);
    console.log('Subscription Details:');
    console.log(`  Balance: ${ethers.formatEther(sub.balance)} LINK`);
    console.log(`  Request Count: ${sub.reqCount}`);
    console.log(`  Owner: ${sub.owner}`);
    console.log(`  Consumers: ${sub.consumers.join(', ')}`);

    if (sub.balance < ethers.parseEther('0.1')) {
      console.warn('⚠️ WARNING: Low LINK balance! Fund subscription.');
    }
  } catch (error) {
    console.error(`❌ Failed to get subscription: ${error.message}`);
  }
}

checkSubscription();
```

#### 2.2 Verify Consumer Contract is Authorized

The `MfssiaOracleConsumer` contract must be added as a consumer to the subscription:

```javascript
async function checkConsumerAuthorization() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, provider);

  const sub = await router.getSubscription(SUBSCRIPTION_ID);
  const consumerAddress = process.env.ORACLE_CONSUMER_ADDRESS;

  if (sub.consumers.includes(consumerAddress)) {
    console.log(`✅ Consumer ${consumerAddress} is authorized`);
  } else {
    console.error(`❌ Consumer ${consumerAddress} is NOT authorized!`);
    console.log('Add it via Chainlink Functions UI or call router.addConsumer()');
  }
}
```

#### 2.3 Check DON Configuration

```bash
# Verify Chainlink config
echo "CHAINLINK_SUBSCRIPTION_ID: $CHAINLINK_SUBSCRIPTION_ID"
echo "CHAINLINK_DON_ID: $CHAINLINK_DON_ID"
echo "CHAINLINK_GAS_LIMIT: $CHAINLINK_GAS_LIMIT"
```

**Common issues:**
- Subscription ID is incorrect or expired
- DON ID doesn't match the network (mainnet vs testnet)
- Gas limit too low for computation

---

### 3. Smart Contract Verification

#### 3.1 Check MfssiaOracleConsumer Deployment

```javascript
const { ethers } = require('ethers');

const CONSUMER_ABI = [
  'function owner() view returns (address)',
  'function s_lastRequestId() view returns (bytes32)',
  'function s_lastError() view returns (bytes)',
  'event VerificationRequested(bytes32 indexed requestId, bytes32 instanceKey, string challengeSet)',
  'event VerificationResponseReceived(bytes32 indexed requestId, bytes32 instanceKey, bytes response, bytes err)'
];

async function checkContract() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const contract = new ethers.Contract(
    process.env.ORACLE_CONSUMER_ADDRESS,
    CONSUMER_ABI,
    provider
  );

  try {
    const owner = await contract.owner();
    console.log(`✅ Contract deployed. Owner: ${owner}`);

    const lastRequestId = await contract.s_lastRequestId();
    console.log(`Last Request ID: ${lastRequestId}`);

    const lastError = await contract.s_lastError();
    if (lastError && lastError !== '0x') {
      console.error(`❌ Last Error: ${ethers.toUtf8String(lastError)}`);
    }
  } catch (error) {
    console.error(`❌ Contract check failed: ${error.message}`);
  }
}

checkContract();
```

#### 3.2 Check Recent Events on Contract

```javascript
async function checkRecentEvents() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const contract = new ethers.Contract(
    process.env.ORACLE_CONSUMER_ADDRESS,
    CONSUMER_ABI,
    provider
  );

  // Get events from last 1000 blocks
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 1000;

  console.log(`Checking events from block ${fromBlock} to ${currentBlock}...`);

  // Check VerificationRequested events
  const requestedFilter = contract.filters.VerificationRequested();
  const requestedEvents = await contract.queryFilter(requestedFilter, fromBlock);
  console.log(`\n📤 VerificationRequested events: ${requestedEvents.length}`);
  requestedEvents.forEach(e => {
    console.log(`  - RequestId: ${e.args.requestId}`);
    console.log(`    InstanceKey: ${e.args.instanceKey}`);
    console.log(`    ChallengeSet: ${e.args.challengeSet}`);
    console.log(`    Block: ${e.blockNumber}`);
  });

  // Check VerificationResponseReceived events
  const responseFilter = contract.filters.VerificationResponseReceived();
  const responseEvents = await contract.queryFilter(responseFilter, fromBlock);
  console.log(`\n📥 VerificationResponseReceived events: ${responseEvents.length}`);
  responseEvents.forEach(e => {
    console.log(`  - RequestId: ${e.args.requestId}`);
    console.log(`    Response: ${e.args.response}`);
    console.log(`    Error: ${e.args.err}`);
    console.log(`    Block: ${e.blockNumber}`);
  });

  // Identify unmatched requests (requested but no response)
  const requestedIds = new Set(requestedEvents.map(e => e.args.requestId));
  const respondedIds = new Set(responseEvents.map(e => e.args.requestId));

  const pendingRequests = [...requestedIds].filter(id => !respondedIds.has(id));
  if (pendingRequests.length > 0) {
    console.log(`\n⚠️ PENDING REQUESTS (no response received):`);
    pendingRequests.forEach(id => console.log(`  - ${id}`));
  }
}

checkRecentEvents();
```

#### 3.3 Verify Callback Permission

The Chainlink Functions Router must be able to call the consumer's `handleOracleFulfillment` function:

```javascript
// Check if the Router is set correctly
async function checkRouterConfig() {
  const consumerAbi = [
    'function getRouter() view returns (address)'
  ];

  const contract = new ethers.Contract(
    process.env.ORACLE_CONSUMER_ADDRESS,
    consumerAbi,
    provider
  );

  const routerAddress = await contract.getRouter();
  console.log(`Contract's Router: ${routerAddress}`);
  console.log(`Expected Router: ${EXPECTED_ROUTER_ADDRESS}`);

  if (routerAddress.toLowerCase() !== EXPECTED_ROUTER_ADDRESS.toLowerCase()) {
    console.error('❌ Router mismatch! Contract may not receive callbacks.');
  }
}
```

---

### 4. Database Diagnostic Queries

#### 4.1 Check PendingVerification Table

```sql
-- Find all stuck pending verifications
SELECT
  id,
  request_id,
  instance_id,
  subject_did,
  challenge_set_code,
  status,
  tx_hash,
  error_message,
  requested_at,
  completed_at
FROM pending_verifications
WHERE status = 'PENDING'
ORDER BY requested_at DESC
LIMIT 50;
```

#### 4.2 Check Challenge Instances Stuck in VERIFICATION_IN_PROGRESS

```sql
-- Find instances stuck in verification
SELECT
  ci.id,
  ci.challenge_set,
  ci.state,
  ci.nonce,
  ci.issued_at,
  ci.expires_at,
  mi.identifier as did,
  COUNT(ce.id) as evidence_count
FROM challenge_instances ci
JOIN mfssia_identities mi ON ci.identity_id = mi.id
LEFT JOIN challenge_evidences ce ON ce.challenge_instance_id = ci.id
WHERE ci.state = 'VERIFICATION_IN_PROGRESS'
GROUP BY ci.id, mi.identifier
ORDER BY ci.issued_at DESC
LIMIT 50;
```

#### 4.3 Check for Orphaned Evidence (Evidence without Oracle Request)

```sql
-- Evidence submitted but no pending verification created
SELECT
  ce.id as evidence_id,
  ce.challenge_id,
  ce.submitted_at,
  ci.id as instance_id,
  ci.state,
  pv.id as pending_id,
  pv.status as pending_status
FROM challenge_evidences ce
JOIN challenge_instances ci ON ce.challenge_instance_id = ci.id
LEFT JOIN pending_verifications pv ON pv.instance_id = ci.id::text
WHERE pv.id IS NULL
  AND ci.state = 'VERIFICATION_IN_PROGRESS'
ORDER BY ce.submitted_at DESC;
```

#### 4.4 Check Attestation Creation Rate

```sql
-- Attestation creation in last 7 days
SELECT
  DATE(created_at) as date,
  COUNT(*) as attestations_created,
  COUNT(DISTINCT identity) as unique_dids
FROM mfssia_attestations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

### 5. Application Logs Analysis

#### 5.1 Check for Oracle-Related Errors

```bash
# Search for Oracle errors
grep -iE "(oracle|chainlink|verification)" /var/log/mfssia/error.log | tail -100

# Search for blockchain connection issues
grep -iE "(provider|websocket|rpc|eth_)" /var/log/mfssia/*.log | grep -iE "(error|fail|timeout)"

# Search for event processing
grep -i "VerificationResponseReceived" /var/log/mfssia/*.log
```

#### 5.2 Check NestJS Event Emitter

```bash
# Verify events are being emitted
grep -i "eventEmitter.emit" /var/log/mfssia/*.log
grep -i "OracleEvent" /var/log/mfssia/*.log
```

#### 5.3 Check DKG Service

```bash
# DKG asset creation logs
grep -iE "(dkg|asset|ual)" /var/log/mfssia/*.log | tail -50
```

---

### 6. Service Health Checks

#### 6.1 Check All NestJS Modules Loaded

```bash
# Application startup logs
grep -i "NestFactory" /var/log/mfssia/*.log
grep -i "successfully started" /var/log/mfssia/*.log

# Check for module initialization errors
grep -iE "(module|provider|service)" /var/log/mfssia/error.log
```

#### 6.2 Process Status

```bash
# Check if MFSSIA process is running
ps aux | grep -i mfssia

# Check memory/CPU usage
top -p $(pgrep -f mfssia) -n 1

# Check open file descriptors (WebSocket connections)
lsof -p $(pgrep -f mfssia) | grep -i socket
```

#### 6.3 Container Health (if Docker)

```bash
# Docker container status
docker ps | grep mfssia

# Container logs
docker logs mfssia-api --tail 500

# Container resource usage
docker stats mfssia-api --no-stream
```

---

### 7. Network Diagnostics

#### 7.1 Check Blockchain RPC Connectivity

```bash
# Test RPC endpoint
curl -X POST $BLOCKCHAIN_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 7.2 Check WebSocket Connectivity

```bash
# Test WebSocket (requires wscat)
wscat -c $BLOCKCHAIN_WS_URL
# Then type: {"jsonrpc":"2.0","method":"eth_subscribe","params":["newHeads"],"id":1}
```

#### 7.3 Check Chainlink DON Reachability

```bash
# Verify the network can reach Chainlink infrastructure
curl -I https://functions.chain.link/
```

---

## Recommended Immediate Actions

### Priority 1: Verify OracleListenerService is Running

```bash
# 1. Check logs for listener startup
grep "OracleListenerService" /var/log/mfssia/*.log

# 2. If not found, restart the application
pm2 restart mfssia-api  # or docker restart mfssia-api

# 3. Monitor logs for event detection
tail -f /var/log/mfssia/combined.log | grep -i oracle
```

### Priority 2: Verify Blockchain Connection

```bash
# Run the connectivity test script above
node test-blockchain-connection.js
```

### Priority 3: Check Chainlink Subscription Balance

1. Go to [Chainlink Functions UI](https://functions.chain.link/)
2. Connect wallet that owns the subscription
3. Verify subscription has sufficient LINK balance (minimum 1 LINK recommended)
4. Verify `MfssiaOracleConsumer` is listed as authorized consumer

### Priority 4: Check for Stuck Requests

```sql
-- Run this query to find stuck requests
SELECT * FROM pending_verifications
WHERE status = 'PENDING'
  AND requested_at < NOW() - INTERVAL '10 minutes';
```

### Priority 5: Manual Event Replay (if events exist on-chain)

If `VerificationResponseReceived` events exist on-chain but weren't processed:

```javascript
// Replay missed events
async function replayMissedEvents(fromBlock, toBlock) {
  const events = await contract.queryFilter(
    contract.filters.VerificationResponseReceived(),
    fromBlock,
    toBlock
  );

  for (const event of events) {
    console.log(`Processing missed event: ${event.args.requestId}`);
    // Manually trigger the handler
    await oracleListenerService.handleVerificationResponse(
      event.args.requestId,
      event.args.instanceKey,
      event.args.response,
      event.args.err
    );
  }
}
```

---

## Expected Resolution

Once the Oracle subsystem is functioning correctly, you should see:

1. **WebSocket Events Flow:**
```
oracle_connected → oracle.subscribed → oracle.verification.requested
→ oracle.verification.processing → oracle.verification.success
```

2. **Instance State Transition:**
```
IN_PROGRESS → VERIFICATION_IN_PROGRESS → VERIFIED
```

3. **Attestation Created:**
```json
{
  "id": "uuid",
  "identity": "did:web:...",
  "challengeSet": "mfssia:Example-A",
  "verifiedChallenges": ["mfssia:C-A-1", "mfssia:C-A-2", ...],
  "ual": "did:dkg:...",
  "validFrom": "2026-01-19T...",
  "validUntil": "2027-01-19T..."
}
```

---

## Contact for Follow-up

Please provide:
1. Results of the diagnostic queries above
2. Relevant log excerpts (last 24 hours)
3. Current Chainlink subscription ID and network
4. Deployed contract addresses

We can then assist with further debugging if needed.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
