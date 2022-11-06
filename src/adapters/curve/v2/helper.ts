import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Token } from "@lib/token";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { BigNumber } from "ethers";

export interface BalanceWithExtraProps extends Balance {
  tokens?: Token[];
  poolAddress?: string
  lpToken?: string
}

export async function getCurveBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  registry?: Contract
) {
  const balances: Balance[] = [];

  if (!registry) {
    console.log("Missing registry contract");

    return [];
  }

  try {
    const nonEmptyPools: Contract[] = (
      await getERC20BalanceOf(ctx, chain, contracts as Token[])
    ).filter((pool) => pool.amount.gt(0));

    for (let i = 0; i < nonEmptyPools.length; i++) {
      const [totalSupplyRes, underlyingsBalancesRes] = await Promise.all([
        call({
          chain,
          target: nonEmptyPools[i].address,
          params: [],
          abi: {
            stateMutability: "view",
            type: "function",
            name: "totalSupply",
            inputs: [],
            outputs: [
              {
                name: "",
                type: "uint256",
              },
            ],
            gas: 3240,
          },
        }),

        call({
          chain,
          target: registry.address,
          params: [nonEmptyPools[i].poolAddress],
          abi: {
            stateMutability: "view",
            type: "function",
            name: "get_underlying_balances",
            inputs: [{ name: "_pool", type: "address" }],
            outputs: [{ name: "", type: "uint256[8]" }],
          },
        }),
      ]);

      const underlyingsBalances: BigNumber[] =
        underlyingsBalancesRes.output.map((res: string) => BigNumber.from(res));

      const totalSupply = BigNumber.from(totalSupplyRes.output);

      const token = await getERC20Details(chain, nonEmptyPools[i].tokens);

      nonEmptyPools[i].underlyings = await getERC20Details(
        chain,
        nonEmptyPools[i].underlyings as any
      );

      /**
       *  Updating pool amounts from the fraction of each underlyings
       */

      const formattedUnderlyings = nonEmptyPools[i].underlyings?.map(
        (underlying, x) => ({
          ...underlying,
          amount:
            underlying.decimals &&
            nonEmptyPools[i].amount
              .mul(underlyingsBalances[x].mul(10 ** (18 - underlying.decimals)))
              .div(totalSupply),
          decimals: 18,
        })
      );

      const balance: BalanceWithExtraProps = {
        chain,
        address: nonEmptyPools[i].address,
        amount: nonEmptyPools[i].amount,
        symbol: token.map((coin) => coin.symbol).join("-"),
        tokens: token.map((coin) => coin),
        underlyings: formattedUnderlyings,
        decimals: 18,
      };

      balances.push(balance);
    }
    return balances;
  } catch (error) {
    console.log("Failed to get pools balances");

    return [];
  }
}
