/**
 * Evidence Generation Utilities for MFSSIA Challenges
 * These functions create properly formatted evidence payloads for different challenge types
 */

/**
 * Generate evidence for C-A-1: Wallet Ownership Proof
 * @param address - Ethereum address
 * @param signature - Signed message proof
 * @param nonce - Challenge nonce
 */
export function generateWalletOwnershipEvidence(address: string, signature: string, nonce: string) {
  return {
    address,
    signature,
    nonce,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate evidence for C-A-2: Liveness Check (Human Interaction)
 * @param interactionData - Data captured from human verification modal
 */
export function generateLivenessEvidence(interactionData: {
  interactionTimestamp: string;
  timeToInteract: number;
  userAgent: string;
}) {
  return {
    ...interactionData,
    // Additional metadata that can help with liveness verification
    screenResolution: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown",
    timestamp: new Date().toISOString(),
  };
}
