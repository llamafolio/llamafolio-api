import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";

const stETH: Contract = {
  name: "stETH",
  displayName: "Liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  symbol: "STETH",
  decimals: 18,
  coingeckoId: "staked-ether",
};

const adapter: Adapter = {
  id: "lido",
  name: "Lido",
  description: "",
  defillama: "lido",
  coingecko: "lido-dao",
  links: {
    website: "https://lido.fi/",
  },
  getContracts() {
    return {
      contracts: [stETH],
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOf(ctx, "ethereum", contracts);

    return {
      balances: balances.map((bal) => ({ ...bal, category: "stake" })),
    };
  },
};

export default adapter;
