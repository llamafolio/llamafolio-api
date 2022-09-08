import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";

const stETH: Contract = {
  name: "rETH",
  displayName: "Liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0xae78736Cd615f374D3085123A210448E74Fc6393",
  symbol: "rETH",
  decimals: 18,
  coingeckoId: "rocket-pool-eth",
};


const adapter: Adapter = {
  id: "rocket-pool",
  getContracts() {
    return {
      contracts: [rETH],
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
