import { Chain } from "@defillama/sdk/build/general";

export const ETH_ADDR = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

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
};
