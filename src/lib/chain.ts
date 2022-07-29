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

export const chainToDefiLlamaChain: { [key: string]: string } = {
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

export function toDefiLlama(chain: string): string | undefined {
  return chainToDefiLlamaChain[chain];
}
