import { Adapter } from "@lib/adapter";
import { Token } from "@lib/token";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";

const COMPToken: Token = {
  chain: "ethereum",
  address: "0xc00e94cb662c3520282e6f5717214004a7f26888",
  decimals: 18,
  symbol: "COMP",
  coingeckoId: "compound-governance-token",
};

const adapter: Adapter = {
  id: "compound",
  async getContracts() {
    const markets = await getMarketsContracts("ethereum", {
      comptrollerAddress: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
    });

    return {
      contracts: markets,
    };
  },
  async getBalances(ctx, contracts) {
    const markets = await getMarketsBalances(ctx, "ethereum", contracts);

    return {
      balances: markets,
    };
  },
};

export default adapter;
