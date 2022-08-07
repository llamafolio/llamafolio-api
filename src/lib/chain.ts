import { Chain } from "@defillama/sdk/build/general";
import { Token } from "@lib/token";

export const chains = [
  "ethereum",
  "avalanche",
  "bsc",
  "fantom",
  "polygon",
  "arbitrum",
  "harmony",
  "celo",
  "gnosis",
];

export const chainToDefiLlamaChain: { [key: string]: Chain } = {
  ethereum: "ethereum",
  avalanche: "avax",
  bsc: "bsc",
  fantom: "fantom",
  polygon: "polygon",
  arbitrum: "arbitrum",
  harmony: "harmony",
  celo: "celo",
  gnosis: "xdai",
};

// inverse mapping
const defiLlamaChainToChain: { [key: string]: string } = {};
for (const chain in chainToDefiLlamaChain) {
  defiLlamaChainToChain[chainToDefiLlamaChain[chain]] = chain;
}

export function fromDefiLlama(chain: string): string | undefined {
  return defiLlamaChainToChain[chain];
}

export function toDefiLlama(chain: string): Chain | undefined {
  return chainToDefiLlamaChain[chain];
}

export const tokens: Token[] = [
  { chain: "ethereum", address: "", symbol: "ETH", decimals: 18 },
  { chain: "fantom", address: "", symbol: "FTM", decimals: 18 },
  { chain: "bsc", address: "", symbol: "BNB", decimals: 18 },
  { chain: "avax", address: "", symbol: "AVAX", decimals: 18 },
];
