import { Adapter, Contract } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "AAVE Lending",
  chain: "ethereum",
  address: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
};

const adapter: Adapter = {
  id: "aave",
  name: "AAVE",
  description: "",
  coingecko: "aave",
  defillama: "aave",
  links: {
    website: "https://app.aave.com/",
    doc: "https://docs.aave.com/hub/",
  },
  getContracts() {
    return {
      contracts: [lendingPoolContract],
    };
  },
  async getBalances(ctx, contracts) {
    const [lendingPoolContract] = contracts;

    const balances = await getLendingPoolBalances(ctx, {
      chain: lendingPoolContract.chain,
      lendingPoolAddress: lendingPoolContract.address,
    });

    return {
      balances,
    };
  },
};

export default adapter;
