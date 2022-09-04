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

const wstETH: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
};

const adapter: Adapter = {
  id: "lido",
  getContracts() {
    return {
      contracts: [stETH, wstETH],
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
