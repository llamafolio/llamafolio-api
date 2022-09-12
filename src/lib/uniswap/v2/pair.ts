import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";

/**
 * Retrieves pairs balances (with underlyings) of Uniswap V2 like Pair.
 * `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) must be defined.
 */
export async function getPairsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  let balances = await getERC20BalanceOf(ctx, chain, contracts);

  return getUnderlyingBalances(chain, balances);
}

/**
 * Retrieves underlying balances of Uniswap V2 like Pair contract balance.
 * `amount`, `underlyings[0]` (token0) and `underlyings[1]` (token1) must be defined.
 */
export async function getUnderlyingBalances(chain: Chain, balances: Balance[]) {
  // filter empty balances
  balances = balances.filter(
    (balance) =>
      balance.amount?.gt(0) &&
      balance.underlyings?.[0] &&
      balance.underlyings?.[1]
  );

  const [token0sBalanceOfRes, token1sBalanceOfRes, totalSupplyRes] =
    await Promise.all([
      multicall({
        chain,
        calls: balances.map((bToken) => ({
          params: [bToken.address],
          target: bToken.underlyings![0].address,
        })),
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "balanceOf",
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

      multicall({
        chain,
        calls: balances.map((bToken) => ({
          params: [bToken.address],
          target: bToken.underlyings![1].address,
        })),
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "balanceOf",
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

      multicall({
        chain: chain,
        calls: balances.map((token) => ({
          params: [],
          target: token.address,
        })),
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

  for (let i = 0; i < balances.length; i++) {
    if (!token0sBalanceOfRes[i].success) {
      console.error(
        "Failed to get balanceOf of token0",
        token0sBalanceOfRes[i]
      );
      continue;
    }
    if (!token1sBalanceOfRes[i].success) {
      console.error(
        "Failed to get balanceOf of token1",
        token1sBalanceOfRes[i]
      );
      continue;
    }
    if (!totalSupplyRes[i].success) {
      console.error("Failed to get totalSupply of token", totalSupplyRes[i]);
      continue;
    }

    const totalSupply = BigNumber.from(totalSupplyRes[i].output);

    const balance0 = BigNumber.from(token0sBalanceOfRes[i].output)
      .mul(balances[i].amount)
      .div(totalSupply);

    const balance1 = BigNumber.from(token1sBalanceOfRes[i].output)
      .mul(balances[i].amount)
      .div(totalSupply);

    balances[i].underlyings = [
      {
        chain,
        address: balances[i].underlyings![0].address,
        symbol: balances[i].underlyings![0].symbol,
        decimals: balances[i].underlyings![0].decimals,
        amount: balance0,
      },
      {
        chain,
        address: balances[i].underlyings![1].address,
        symbol: balances[i].underlyings![1].symbol,
        decimals: balances[i].underlyings![1].decimals,
        amount: balance1,
      },
    ];
  }

  return balances;
}
