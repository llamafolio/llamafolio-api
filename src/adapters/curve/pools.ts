import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { range } from "@lib/array";
import { multicall } from "@lib/multicall";
import { ethers } from "ethers";
import { ETH_ADDR } from "@lib/token";
import { BalanceWithExtraProps, getCurveBalances } from "./helper";

export async function getPoolsContracts(chain: Chain, contract?: Contract) {
  const pools: Contract[] = [];

  if (!contract) {
    console.log("Missing registry contract");

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
        coinsAddressesRes[i]
          .filter(
            (coin: string) =>
              coin.toLowerCase() !== ethers.constants.AddressZero
          )
          .map((coin: string) =>
            coin.toLowerCase() === ETH_ADDR
              ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
              : coin
          )
      );
      underlyingsAddresses.push(
        underlyingsAddressesRes[i]
          .filter(
            (coin: string) =>
              coin.toLowerCase() !== ethers.constants.AddressZero
          )
          .map((coin: string) =>
            coin.toLowerCase() === ETH_ADDR
              ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
              : coin
          )
      );
    }

    for (let i = 0; i < nonDuplicatePoolAddresses.length; i++) {
      pools.push({
        chain,
        name: poolsDetailsNames[i],
        address: poolsLPTokens[i],
        lpToken: poolsLPTokens[i],
        poolAddress: nonDuplicatePoolAddresses[i],
        tokens: coinsAddresses[i],
        underlyings: underlyingsAddresses[i],
      });
    }

    return pools;
  } catch (error) {
    console.log("Failed to get pools contracts");

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
    console.log("Missing registry contract");

    return [];
  }

  try {
    const poolsBalances = await getCurveBalances(
      ctx,
      chain,
      contracts,
      registry
    );

    for (let i = 0; i < poolsBalances.length; i++) {
      const pool = poolsBalances[i];

      const balance: BalanceWithExtraProps = {
        ...pool,
        category: "lp",
      };
      balances.push(balance);
    }
    return balances;
  } catch (error) {
    console.log("Failed to get pools balances");

    return [];
  }
}
