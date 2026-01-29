/**
 * DKG (Decentralized Knowledge Graph) Utilities
 *
 * Helper functions for working with OriginTrail DKG UALs and explorer URLs.
 */

/**
 * Known testnet blockchain identifiers in UAL format.
 * - otp:20430 = Neuroweb testnet (OriginTrail Parachain testnet)
 * - gnosis:10200 = Chiado (Gnosis testnet)
 */
const TESTNET_CHAIN_IDS = ["20430", "10200"];

/**
 * DKG Explorer base URLs
 */
const DKG_EXPLORER_MAINNET = "https://dkg.origintrail.io";
const DKG_EXPLORER_TESTNET = "https://dkg-testnet.origintrail.io";

/**
 * Determines if a UAL belongs to a testnet network.
 *
 * @param ual - Universal Asset Locator (e.g., "did:dkg:otp:20430/0x.../123")
 * @returns true if the UAL is from a testnet network
 */
export function isTestnetUAL(ual: string): boolean {
  // Extract blockchain identifier from UAL: did:dkg:{blockchain}/{contract}/{id}
  const match = ual.match(/^did:dkg:([^/]+)/);
  const blockchain = match?.[1]?.toLowerCase() || "";

  return TESTNET_CHAIN_IDS.some(chainId => blockchain.includes(chainId));
}

/**
 * Returns the correct DKG Explorer URL for a given UAL.
 * Automatically detects testnet vs mainnet based on the blockchain identifier.
 *
 * UAL format: did:dkg:{blockchain}/{contract}/{tokenId}[/{kaTokenId}]
 *
 * Examples:
 * - Testnet: did:dkg:otp:20430/0xcdb28e93ed340ec10a71bba00a31dbfcf1bd5d37/595883
 * - Mainnet: did:dkg:otp:2043/0x5cac41237127f94c2d21dae0b14bfefa99880630/308028
 *
 * @param ual - Universal Asset Locator
 * @returns Full DKG Explorer URL with the UAL as query parameter
 */
export function getDkgExplorerUrl(ual: string): string {
  const baseUrl = isTestnetUAL(ual) ? DKG_EXPLORER_TESTNET : DKG_EXPLORER_MAINNET;
  return `${baseUrl}/explore?ual=${encodeURIComponent(ual)}`;
}

/**
 * Parses a UAL into its components.
 *
 * @param ual - Universal Asset Locator
 * @returns Parsed UAL components or null if invalid
 */
export function parseUAL(ual: string): {
  blockchain: string;
  contract: string;
  kcTokenId: number;
  kaTokenId?: number;
} | null {
  if (!ual.startsWith("did:dkg:")) {
    return null;
  }

  const parts = ual.replace("did:dkg:", "").split("/");

  if (parts.length < 3) {
    return null;
  }

  return {
    blockchain: parts[0],
    contract: parts[1],
    kcTokenId: parseInt(parts[2], 10),
    kaTokenId: parts[3] ? parseInt(parts[3], 10) : undefined,
  };
}

/**
 * Constructs a UAL from its components.
 *
 * @param blockchain - Blockchain identifier (e.g., "otp:20430")
 * @param contract - Contract address
 * @param kcTokenId - Knowledge Collection token ID
 * @param kaTokenId - Optional Knowledge Asset token ID
 * @returns Formatted UAL string
 */
export function buildUAL(blockchain: string, contract: string, kcTokenId: number, kaTokenId?: number): string {
  const base = `did:dkg:${blockchain.toLowerCase()}/${contract.toLowerCase()}/${kcTokenId}`;
  return kaTokenId !== undefined ? `${base}/${kaTokenId}` : base;
}
