import { Chain } from "@defillama/sdk/build/general";
import {
  Adapter,
  Balance,
  BaseContext,
  BaseContract,
  Contract,
} from "@lib/adapter";
import { Token } from "@lib/token";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";

const getBalances = async (
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract
) => {
  const calls = contracts.map((token: Contract) => ({
    target: token.address,
    params: [ctx.address],
  }));
  const balanceOfRes = await multicall({
    chain,
    calls,
    abi: {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });
  
  const balanceOf = balanceOfRes
  .filter((res) => res.success)
  .map((res) => res.output)

  const stakeAmount = BigNumber.from(balanceOf[1])
  const rewardsAmount = BigNumber.from(balanceOf[2])

  const balances:Balance = {
    ...SWISE,
    category: "stake",
    amount: stakeAmount,
    underlyings: [{...underlyings, amount: stakeAmount}],
    rewards: [{...underlyings, amount: rewardsAmount}],
  }
  return balances
};

const SWISE: Contract = {
  name: "StakeWise",
  displayName: "",
  chain: "ethereum",
  address: "0x48c3399719b582dd63eb5aadf12a40b4c3f52fa2",
  decimals: 18,
  symbol: "SWISE",
};

const sEth2: Token = {
  // name: "StakeWise Staked ETH2",
  chain: "ethereum",
  address: "0xFe2e637202056d30016725477c5da089Ab0A043A",
  decimals: 18,
  symbol: "sETH2",
};

const rEth2: Token = {
  // name: "StakeWise Reward ETH2"
  chain: "ethereum",
  address: "0x20bc832ca081b91433ff6c17f85701b6e92486c5",
  decimals: 18,
  symbol: "rEth2",
};

const underlyings: Token = {
  // name: "WETH",
  chain: "ethereum",
  address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  decimals: 18,
  symbol: "WETH"
}

const adapter: Adapter = {
  id: "stakewise",
  async getContracts() {
    return {
      contracts: [SWISE, sEth2, rEth2],
    };
  },
  async getBalances(ctx, contracts: BaseContract) {
    const stakeBalance = await getBalances(ctx, "ethereum", contracts);

    let balances = [stakeBalance];

    return {
      balances,
    };
  },
};

export default adapter;
