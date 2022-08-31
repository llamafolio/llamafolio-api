import { Chain } from "@defillama/sdk/build/general";

export type Token = {
  chain: Chain;
  address: string;
  symbol: string;
  decimals: number;
  native?: boolean;
  coingeckoId?: string;
  // optional token used to retrieve price.
  // ex: WETH -> ETH
  priceSubstitute?: string;
  // optional underlying tokens.
  // ex: aToken -> token (AAVE)
  // ex: Uniswap Pair -> [token0, token1]
  underlyings?: Token[];
};
