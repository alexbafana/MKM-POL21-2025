# MFSSIA API Reference

## IMPORTANT: NO API KEY REQUIRED

**The MFSSIA API is a PUBLIC API and does NOT require any API key or authentication.**

All API requests are made without Authorization headers. Any code or documentation suggesting the use of `MFSSIA_API_KEY` is incorrect and has been removed.

## Configuration

Only two environment variables are needed:

```bash
# Enable MFSSIA integration
NEXT_PUBLIC_MFSSIA_ENABLED=true

# MFSSIA API base URL
MFSSIA_API_URL=https://api.dymaxion-ou.co
```

## API Response Format

**IMPORTANT:** The MFSSIA API wraps all responses in a standard envelope:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // ... actual response data here ...
  },
  "statusCode": 200,
  "timestamp": "2026-01-02T12:00:00.000Z"
}
```

**Our API routes automatically unwrap this** and return just the `data` field to the client, so you don't need to handle the wrapper in your frontend code.

## API Endpoints

All endpoints are public and accessible without authentication:

### 1. Register DID
```
POST /api/identities/register
Content-Type: application/json

Body:
{
  "did": "did:web:mkmpol21:0x...",
  "requestedChallengeSet": "mfssia:Example-U"
}
```

### 2. Create Challenge Instance
```
POST /api/challenge-instances
Content-Type: application/json

Body:
{
  "did": "did:web:mkmpol21:0x...",
  "challengeSet": "mfssia:Example-U"
}
```

### 3. Submit Evidence
```
POST /api/challenge-evidence
Content-Type: application/json

Body:
{
  "challengeInstanceId": "...",
  "challengeId": "mfssia:C-U-1",
  "evidence": { ... }
}
```

### 4. Get Attestation
```
GET /api/attestations/did/{did}
Content-Type: application/json
```

## Challenge Sets

- **mfssia:Example-U**: DAO User Onboarding (C-U-1 + C-U-2)
- **mfssia:Example-A**: Individual User Authentication
- **mfssia:Example-B**: Institutional Authentication
- **mfssia:Example-C**: Economic Activity Classification (RDF)
- **mfssia:Example-D**: Employment Event Detection (RDF)

## Implementation Files

The following files implement MFSSIA integration:

### API Routes (Next.js)
- `packages/nextjs/app/api/mfssia/register-did/route.ts`
- `packages/nextjs/app/api/mfssia/challenge-instance/route.ts`
- `packages/nextjs/app/api/mfssia/submit-evidence/route.ts`
- `packages/nextjs/app/api/mfssia/attestation/[did]/route.ts`

### Service Layer
- `packages/nextjs/services/MFSSIAService.ts` - Client service for MFSSIA API

### Hooks
- `packages/nextjs/hooks/useOnboarding.ts` - Onboarding flow with MFSSIA verification

### Smart Contracts
- `packages/hardhat/contracts/_MFSSIA_authentication.sol` - Attestation verification

## Security Note

The MFSSIA API is intentionally public to enable decentralized identity verification. All sensitive operations are protected by cryptographic signatures and zero-knowledge proofs, not API keys.

## Troubleshooting

If you see errors about missing API keys:
1. Check that you're using the latest code (all API key references removed)
2. Restart your Next.js server after updating .env.local
3. Clear browser cache/localStorage if needed

The API should work immediately with just `NEXT_PUBLIC_MFSSIA_ENABLED=true` set.
