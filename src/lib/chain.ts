import { Chain } from "@defillama/sdk/build/general";
import { Token } from "@lib/token";

// Currently supported chains
export const chains: Chain[] = [
  "ethereum",
  "avax",
  "bsc",
  "fantom",
  "polygon",
  "arbitrum",
  "harmony",
  "celo",
  "xdai",
  "optimism",
];

export const tokens: Token[] = [
  { chain: "ethereum", address: "", symbol: "ETH", decimals: 18 },
  { chain: "fantom", address: "", symbol: "FTM", decimals: 18 },
  { chain: "bsc", address: "", symbol: "BNB", decimals: 18 },
  { chain: "avax", address: "", symbol: "AVAX", decimals: 18 },
];
