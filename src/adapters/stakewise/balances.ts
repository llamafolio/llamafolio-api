import { Chain } from "@defillama/sdk/build/general";
import {
  Balance,
  BaseContext,
  Contract,
} from "@lib/adapter";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";
import { abi } from "@lib/erc20";

interface Token extends Contract {
  name: string;
}

const WETH: Token = {
  name: "WETH",
  chain: "ethereum",
  address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  decimals: 18,
  symbol: "WETH",
};

const SWISE: Token = {
  name: "StakeWise",
  chain: "ethereum",
  address: "0x48c3399719b582dd63eb5aadf12a40b4c3f52fa2",
  decimals: 18,
  symbol: "SWISE",
  underlyings: [WETH],
  rewards: [WETH]
};

export async function getBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract
) {
  const calls = contracts.map((token: Contract) => ({
    target: token.address,
    params: [ctx.address],
  }));

  const [stakeBalanceRes, rewardsBalanceRes] = await multicall({
    chain,
    calls,
    abi: abi.balanceOf,
  });

  const stakeBalance = BigNumber.from(stakeBalanceRes.output)
  const rewardsBalances = BigNumber.from(rewardsBalanceRes.output)

  const underlyings = SWISE.underlyings?.map((underlying) => {
    return {
        ...underlying,
        amount: stakeBalance
    }
  })

  const rewards = SWISE.rewards?.map((reward) => {
    return {
        ...reward,
        amount: rewardsBalances
    }
  })

  const balances: Balance = {
    ...SWISE,
    category: "stake",
    amount: stakeBalance,
    underlyings,
    rewards,
  };
  return balances;
}
