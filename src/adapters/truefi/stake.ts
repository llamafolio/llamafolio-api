import { BigNumber } from "ethers";
import { Chain } from "@lib/providers";
import { Balance, BaseContext } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { PoolSupply } from "./pools";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  pools: PoolSupply[]
) {
  const balances: Balance[] = [];

  const calls = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }));

  const balanceOf = await multicall({
    chain,
    calls,
    abi: abi.balanceOf,
  });

  for (let i = 0; i < pools.length; i++) {
    if (!balanceOf[i].success) {
      continue;
    }

    const amount = BigNumber.from(balanceOf[i].output)
      .mul(pools[i].poolValue)
      .div(pools[i].totalSupply);

    const balance: Balance = {
      ...pools[i],
      category: "stake",
      amount,
      underlyings: [{ ...pools[i].underlyings[0], amount }],
    };

    balances.push(balance);
  }

  return balances;
}
