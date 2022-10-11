import {
  Adapter,
  BaseContext,
  BaseContract,
  Contract,
} from "@lib/adapter";
import { getBalances } from "./balances";

const sEth2: Contract = {
  name: "StakeWise Staked ETH2",
  chain: "ethereum",
  address: "0xFe2e637202056d30016725477c5da089Ab0A043A",
  decimals: 18,
  symbol: "sETH2",
};

const rEth2: Contract = {
  name: "StakeWise Reward ETH2",
  chain: "ethereum",
  address: "0x20bc832ca081b91433ff6c17f85701b6e92486c5",
  decimals: 18,
  symbol: "rEth2",
};

const adapter: Adapter = {
  id: "stakewise",
  async getContracts() {
    return {
      contracts: [sEth2, rEth2],
    };
  },
  async getBalances(ctx:BaseContext, contracts: BaseContract) {
    const stakeBalance = await getBalances(ctx, "ethereum", contracts);

    let balances = [stakeBalance];

    return {
      balances,
    };
  },
};

export default adapter;
