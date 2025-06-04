# 🔐 mfssia/

This folder implements the **Multi-Factor Challenge Set Self-Sovereign Identity Authentication (MFSSIA)** framework, which provides secure, decentralized, and verifiable identity authentication for actors interacting with the blockchain-based Decentralized Knowledge Graph (DKG) and DAO-governed processes. It plays a pivotal role in ensuring access control, provenance assurance, and role-based trust across all layers of the MKM-POL21-2025 platform.

---

## 🎯 Purpose

The MFSSIA component enables:

- **User and agent authentication** via configurable multi-factor challenge sets.
- **On-chain identity binding** with role-specific access rights in DAO-managed workflows.
- **Credential-based access control** for publishing, verifying, and curating assets in the DKG.
- **Integration with DAO-ML models** and smart contracts to enforce authenticated, permissioned participation.

It allows for **fine-grained, auditable identity control** in scenarios where cultural data, media assets, or governance decisions require trust, accountability, and privacy compliance.

---

## 🧠 Core Concepts

### 🧾 Challenge Sets
MFSSIA defines a **configurable set of challenges** (e.g. biometric, password, device ownership, credential proof) that a user must satisfy in sequence or combination. These challenge sets can be tailored to specific roles (e.g. publisher, validator, agent).

### 🪪 Self-Sovereign Identity (SSI)
MFSSIA is aligned with the principles of SSI:
- Users hold and control their credentials.
- Verification is decentralized and cryptographically secure.
- No central authority is needed for authentication.

### 🧬 Identity Linkage
Each authenticated entity can be:
- Linked to a DAO role (as defined in DAO-ML).
- Associated with provenance metadata for DKG entries.
- Subject to permission checks in smart contracts.

---

## 🛠 Structure of the Folder

```plaintext
mfssia/
├── challenge_sets/              # YAML/JSON definitions of MFA challenge flows
├── smart_contracts/             # Solidity interfaces for verifying identity and roles
├── verifier_lib/                # Python/Node modules for off-chain challenge evaluation
├── user_registry.json           # List of known actors, public keys, and roles
├── session_logs/                # Encrypted logs of challenge completions and results
└── examples/                    # Example flows: curator login, DAO proposal signer, etc.

