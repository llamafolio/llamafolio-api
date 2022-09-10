import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { Balance } from "@lib/adapter";

/**
 * Retrieves underlying balances of Uniswap V2 like Pair contract balance.
 * `amount`, `token0` and `token1` must be defined.
 */
export async function getUnderlyingBalances(chain: Chain, balances: Balance[]) {
  // filter empty balances
  balances = balances.filter(
    (balance) => balance.amount?.gt(0) && balance.token0 && balance.token1
  );

  const [token0sBalanceOfRes, token1sBalanceOfRes, totalSupplyRes] =
    await Promise.all([
      multicall({
        chain,
        calls: balances.map((bToken) => ({
          params: [bToken.address],
          target: bToken.token0.address,
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
          target: bToken.token1.address,
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
        address: balances[i].token0.address,
        symbol: balances[i].token0.symbol,
        decimals: balances[i].token0.decimals,
        amount: balance0,
      },
      {
        chain,
        address: balances[i].token1.address,
        symbol: balances[i].token1.symbol,
        decimals: balances[i].token1.decimals,
        amount: balance1,
      },
    ];
  }

  return balances;
}
