# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MKMPOL21 DAO** is a decentralized governance system for managing public data built on Scaffold-ETH 2. It implements a role-based permission system with three governance committees (Consortium, Validation Committee, Dispute Resolution Board) using optimistic governance patterns.

**Tech Stack:**
- Smart Contracts: Hardhat, Solidity ^0.8.0, OpenZeppelin (Contracts & Upgradeable)
- Frontend: Next.js 15 (App Router), React 19, RainbowKit, Wagmi, Viem
- Indexing: Ponder (GraphQL event indexer)
- Monorepo: Yarn workspaces

## Common Commands

### Development Workflow
```bash
# Start local blockchain
yarn chain

# Deploy contracts (runs custom script with PK handling)
yarn deploy

# Start Next.js frontend
yarn start              # or yarn next:dev

# Run all three in separate terminals for full dev environment
```

### Smart Contracts (Hardhat)
```bash
yarn hardhat:test       # Run tests
yarn hardhat:compile    # Compile contracts
yarn hardhat:lint       # Lint Solidity files
yarn hardhat:format     # Format Solidity files
yarn hardhat:verify     # Verify on Etherscan
```

### Frontend (Next.js)
```bash
yarn next:build         # Production build
yarn next:lint          # Lint TypeScript/React
yarn next:format        # Format TypeScript/React
yarn next:check-types   # Type checking
```

### Ponder Indexer
```bash
yarn ponder:dev         # Start Ponder dev server (GraphQL at :42069)
yarn ponder:codegen     # Generate types from schema
yarn ponder:start       # Production mode
```

### Linting & Formatting
```bash
yarn lint               # Lint both frontend and contracts
yarn format             # Format both frontend and contracts
```

## Architecture

### Smart Contract System

The contract architecture is centered around **MKMPOL21.sol** (Permission Manager) which controls a role-based access system with 9 roles encoded as `uint32` values.

#### Core Contracts

1. **MKMPOL21.sol** (`packages/hardhat/contracts/`)
   - Central permission manager implementing `IPermissionManager`
   - Manages 9 roles with hierarchical control relations using bitmask encoding
   - Each role has an ID (0-31) and control bitmask (bits 5+)
   - Role encoding: `role_value = (control_bitmask << 5) | role_index`
   - Key roles:
     - Index 5: MKMPOL21Owner (deployer, value 1029)
     - Index 6: Consortium (value 1030)
     - Index 7: Validation_Committee (value 1031)
     - Index 8: Dispute_Resolution_Board (value 1032)
   - Functions: `assignRole()`, `revokeRole()`, `hasRole()`, `has_permission()`

2. **VotingPowerToken.sol**
   - ERC20Votes token for governance voting power
   - Ownership transferred to MKMPOL21 during deployment

3. **Consortium.sol** (Governance Committee #1)
   - Extends OpenZeppelin Governor with optimistic governance
   - Uses `challengePeriod` (default 3 days) before execution
   - Permission-gated via `IPermissionManager` (indexes 28, 29)
   - Functions: `propose()`, `vetoProposal()`, `executeProposal()`

4. **Validation_Committee.sol** (Governance Committee #2)
   - Similar structure to Consortium
   - Different permission indexes for voting/proposing

5. **Dispute_Resolution_Board.sol** (Governance Committee #3)
   - Handles dispute resolution via governance

6. **Governance Area (GA) contracts** (prefixed with `_`)
   - `_dao_management.sol`, `_data_validation.sol`, `_dispute_resolution.sol`
   - `_data_access.sol`, `_RDF_data_retrieval.sol`, `_MFSSIA_authentication.sol`
   - `_membersip_manager.sol`
   - These implement specific business logic areas

#### Deployment Flow (`packages/hardhat/deploy/00_deploy_your_contract.ts`)

1. Deploy `VotingPowerToken` (deployer as initial owner)
2. Deploy `MKMPOL21` (deployer gets role index 5 = Owner)
3. Transfer token ownership to MKMPOL21
4. Deploy committee contracts (Consortium, Validation_Committee, Dispute_Resolution_Board)
5. Call `MKMPOL21.initializeCommittees()` to assign committee addresses to roles 6, 7, 8
6. Committees are initialized ONLY if all three exist

**Important:** The deployment script (`scripts/runHardhatDeployWithPK.ts`) handles private key management. It's invoked via `yarn deploy`.

### Frontend Architecture

Built with **Next.js 15 App Router** (NOT Pages Router).

#### Key Pages (`packages/nextjs/app/`)
- `/` - Homepage
- `/admin` - Role assignment UI (Owner only)
- `/committees/consortium` - Consortium governance interface
- `/committees/validation` - Validation Committee interface
- `/committees/dispute` - Dispute Resolution Board interface
- `/roles-permissions` - View role/permission matrix
- `/debug` - Scaffold-ETH debug contracts UI

#### Custom Hooks
- `useDeployedMkmp()` - Returns deployed MKMPOL21 address for current chain
- Standard Scaffold-ETH hooks in `packages/nextjs/hooks/scaffold-eth/`:
  - `useScaffoldReadContract` - Read contract data
  - `useScaffoldWriteContract` - Write transactions
  - `useScaffoldEventHistory` - Query historical events

#### Contract Interaction Pattern (from `.cursor/rules/scaffold-eth.mdc`)

**Reading:**
```typescript
const { data } = useScaffoldReadContract({
  contractName: "MKMPOL21",
  functionName: "hasRole",
  args: [address],
});
```

**Writing:**
```typescript
const { writeContractAsync } = useScaffoldWriteContract({ contractName: "MKMPOL21" });
await writeContractAsync({
  functionName: "assignRole",
  args: [userAddress, roleValue],
});
```

**Events:**
```typescript
const { data: events } = useScaffoldEventHistory({
  contractName: "MKMPOL21",
  eventName: "RoleAssigned",
  watch: true,
});
```

**Never** use patterns outside these hooks. Contract addresses are read from `packages/nextjs/contracts/deployedContracts.ts`.

#### Components (`packages/nextjs/components/scaffold-eth/`)
- `Address` - Display Ethereum addresses
- `AddressInput` - User input for addresses
- `Balance` - Display ETH/USDC balance
- `EtherInput` - ETH amount input with USD conversion

### Ponder Indexer

Located in `packages/ponder/`:
- Schema: `ponder.schema.ts`
- Config: `ponder.config.ts` (auto-generated from deployed contracts)
- Indexers: `src/*.ts` (event handlers)
- GraphQL endpoint: `http://localhost:42069` in dev mode

Example query from frontend:
```typescript
const response = await fetch('http://localhost:42069/graphql', {
  method: 'POST',
  body: JSON.stringify({ query: '...' }),
});
```

## Permission System Mechanics

The MKMPOL21 permission system uses bitwise operations for efficient role control:

- **Role Encoding:** Each role is a `uint32` where:
  - Bits 0-4: Role index (0-8)
  - Bits 5+: Control bitmask (which roles can control this role)

- **Control Check:** `controlledBy` modifier validates:
  1. Sender has a role that can control the target user's role
  2. Sender can control the new role being assigned
  3. Uses `(role_control_bitmask >> 5) & (1 << sender_role_index)`

- **Permissions:** Stored as `uint64[9]` array, one per role
  - Each bit represents a permission (0-63)
  - Check via: `role_permissions[role_index] & (1 << permission_index) != 0`

## Testing

Smart contract tests in `packages/hardhat/test/`. Run with:
```bash
yarn hardhat:test
```

Tests use Hardhat's testing framework with Chai matchers.

## Configuration

- **Frontend network config:** `packages/nextjs/scaffold.config.ts`
  - Default: `chains.hardhat` (local)
  - Change `targetNetworks` for deployment
- **Hardhat config:** `packages/hardhat/hardhat.config.ts`
- **Challenge period:** 3 days (259200 seconds) - set in deployment script

## Development Notes

- The monorepo uses **Yarn workspaces** - always run commands from root
- Contract hot reload: Frontend auto-updates when contracts change
- Modified file: `packages/nextjs/governance/membership/page.tsx` (per git status)
- Node version: >=20.18.3 (enforced in package.json)
- Husky + lint-staged configured for pre-commit hooks
