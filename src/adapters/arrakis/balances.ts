import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";
import { getERC20BalanceOf } from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Chain } from "@lib/providers";

export async function getLpBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  const balancesRaw = await getERC20BalanceOf(ctx, chain, contracts);

  const nonZeroBalances = balancesRaw.filter((balance) => balance.amount.gt(0));

  const calls = nonZeroBalances.map((balance) => ({
    params: [],
    target: balance.address,
  }));

  const [underlyingBalancesRes, totalSupplyRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: "getUnderlyingBalances",
        outputs: [
          {
            internalType: "uint256",
            name: "amount0Current",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount1Current",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain: chain,
      calls: calls,
      abi: {
        inputs: [],
        name: "totalSupply",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  for (let i = 0; i < calls.length; i++) {
    if (!underlyingBalancesRes[i].success || !totalSupplyRes[i].success) {
      continue;
    }

    nonZeroBalances[i].underlyings![0].amount = BigNumber.from(
      nonZeroBalances[i].amount
    )
      .mul(underlyingBalancesRes[i].output.amount0Current)
      .div(totalSupplyRes[i].output);

    nonZeroBalances[i].underlyings![1].amount = BigNumber.from(
      nonZeroBalances[i].amount
    )
      .mul(underlyingBalancesRes[i].output.amount1Current)
      .div(totalSupplyRes[i].output);

    nonZeroBalances[i].category = "lp";
    balances.push(nonZeroBalances[i]);
  }

  return balances;
}
