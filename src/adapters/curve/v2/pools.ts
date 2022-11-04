import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { range } from "@lib/array";
import { multicall } from "@lib/multicall";
import { ethers } from "ethers";
import { ETH_ADDR, Token } from "@lib/token";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { BigNumber } from "ethers";

export async function getPoolsContracts(chain: Chain, contract?: Contract) {
  const pools: Contract[] = [];

  if (!contract) {
    return [];
  }

  try {
    const poolsCountRes = await call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        stateMutability: "view",
        type: "function",
        name: "pool_count",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
      },
    });

    const poolAddressesRes = await multicall({
      chain,
      calls: range(0, poolsCountRes.output).map((i) => ({
        target: contract.address,
        params: [i],
      })),
      abi: {
        stateMutability: "view",
        type: "function",
        name: "pool_list",
        inputs: [{ name: "_index", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
      },
    });

    const poolAddresses = poolAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const nonDuplicatePoolAddresses = [...new Set(poolAddresses)];

    const calls = nonDuplicatePoolAddresses.map((address) => ({
      target: contract.address,
      params: [address],
    }));

    const [
      poolsDetailsNamesRes,
      poolsLPTokensRes,
      coinsAddressesResponse,
      underlyingsAddressesResponse,
    ] = await Promise.all([
      multicall({
        chain,
        calls,
        abi: {
          stateMutability: "view",
          type: "function",
          name: "get_pool_name",
          inputs: [{ name: "_pool", type: "address" }],
          outputs: [{ name: "", type: "string" }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: "view",
          type: "function",
          name: "get_lp_token",
          inputs: [{ name: "_pool", type: "address" }],
          outputs: [{ name: "", type: "address" }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: "view",
          type: "function",
          name: "get_coins",
          inputs: [{ name: "_pool", type: "address" }],
          outputs: [{ name: "", type: "address[8]" }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: "view",
          type: "function",
          name: "get_underlying_coins",
          inputs: [{ name: "_pool", type: "address" }],
          outputs: [{ name: "", type: "address[8]" }],
        },
      }),
    ]);

    const poolsDetailsNames = poolsDetailsNamesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const poolsLPTokens = poolsLPTokensRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const coinsAddressesRes = coinsAddressesResponse
      .filter((res) => res.success)
      .map((res) => res.output);

    const underlyingsAddressesRes = underlyingsAddressesResponse
      .filter((res) => res.success)
      .map((res) => res.output);

    const coinsAddresses = [];
    const underlyingsAddresses = [];

    for (let i = 0; i < coinsAddressesRes.length; i++) {
      coinsAddresses.push(
        coinsAddressesRes[i].filter(
          (coin: string) =>
            coin.toLowerCase() !== ethers.constants.AddressZero &&
            coin.toLowerCase() !== ETH_ADDR
        )
      );
      underlyingsAddresses.push(
        underlyingsAddressesRes[i].filter(
          (coin: string) =>
            coin.toLowerCase() !== ethers.constants.AddressZero &&
            coin.toLowerCase() !== ETH_ADDR
        )
      );
    }

    for (let i = 0; i < nonDuplicatePoolAddresses.length; i++) {
      pools.push({
        chain,
        name: poolsDetailsNames[i],
        address: poolsLPTokens[i],
        poolAddress: nonDuplicatePoolAddresses[i],
        coins: coinsAddresses[i],
        underlyings: underlyingsAddresses[i],
      });
    }

    return pools;
  } catch (error) {
    return [];
  }
}

export async function getPoolsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  registry?: Contract
) {
  const balances: Balance[] = [];

  if (!registry) {
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

      const underlyingsBalances = underlyingsBalancesRes.output.map(
        (res: string) => BigNumber.from(res)
      );

      const totalSupply = BigNumber.from(totalSupplyRes.output);
      const coins = await getERC20Details(chain, nonEmptyPools[i].coins);

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

      const balance: Balance = {
        chain,
        address: nonEmptyPools[i].address,
        amount: nonEmptyPools[i].amount,
        symbol: coins.map((coin) => coin.symbol).join("-"),
        underlyings: formattedUnderlyings,
        decimals: 18,
        category: "lp",
      };

      balances.push(balance);
    }
    return balances;
  } catch (error) {
    return [];
  }
}
