import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY, ScaffoldConfig } from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

/**
 * Get the dynamic RPC URL for Hardhat network.
 * In Docker deployment, uses the same hostname as the frontend with port 8545.
 */
const getHardhatRpcUrl = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined; // SSR - use default
  }
  // Use the same hostname as the frontend, with port 8545 for the RPC
  const hostname = window.location.hostname;
  // If accessing via localhost, use localhost; otherwise use the server hostname
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return undefined; // Use default localhost:8545
  }
  return `http://${hostname}:8545`;
};

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors(),
  ssr: true,
  client: ({ chain }) => {
    let rpcFallbacks = [http()];
    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];

    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), http()];
    } else if (chain.id === hardhat.id) {
      // For Hardhat network, dynamically determine RPC URL based on hostname
      const dynamicRpcUrl = getHardhatRpcUrl();
      if (dynamicRpcUrl) {
        rpcFallbacks = [http(dynamicRpcUrl), http()];
      }
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        rpcFallbacks = isUsingDefaultKey ? [http(), http(alchemyHttpUrl)] : [http(alchemyHttpUrl), http()];
      }
    }
    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      pollingInterval: scaffoldConfig.pollingInterval,
    });
  },
});
