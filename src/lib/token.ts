import { Chain } from "@defillama/sdk/build/general";

export type Token = {
  chain: Chain;
  address: string;
  symbol: string;
  decimals: number;
};
