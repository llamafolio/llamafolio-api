import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { abi, getERC20Details } from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { range } from "@lib/array";
import { MetaRegistry } from "./helper";
import { ETH_ADDR } from "@lib/token";
import { getERC20BalanceOf } from "@lib/erc20";
import { Token } from "@lib/token";
import { BalanceWithExtraProps } from "@adapters/curve/helper";
import { getCVXRatio } from "./helper";
import { isNotNullish } from "@lib/type";

const CRV: Token = {
  chain: "ethereum",
  address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  symbol: "CRV",
  decimals: 18,
};

const CVX: Token = {
  chain: "ethereum",
  address: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
  symbol: "CVX",
  decimals: 18,
};

export async function getPoolsContract(chain: Chain, contract: Contract) {
  const pools: Contract[] = [];

  const poolsCountRes = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: "poolLength",
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
  });

  const poolInfoRes = await multicall({
    chain,
    calls: range(0, poolsCountRes.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "poolInfo",
      outputs: [
        { internalType: "address", name: "lptoken", type: "address" },
        { internalType: "address", name: "token", type: "address" },
        { internalType: "address", name: "gauge", type: "address" },
        { internalType: "address", name: "crvRewards", type: "address" },
        { internalType: "address", name: "stash", type: "address" },
        { internalType: "bool", name: "shutdown", type: "bool" },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const poolInfo = poolInfoRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const lptokensAddresses = poolInfo.map((lp) => lp.lptoken);
  const lpTokens = await getERC20Details(chain, lptokensAddresses);

  const poolAddressFromLpTokenRes = await multicall({
    chain,
    calls: lpTokens.map((token) => ({
      target: MetaRegistry.address,
      params: [token.address],
    })),
    abi: {
      stateMutability: "view",
      type: "function",
      name: "get_pool_from_lp_token",
      inputs: [{ name: "arg0", type: "address" }],
      outputs: [{ name: "", type: "address" }],
      gas: 2443,
    },
  });

  const poolAddressFromLpToken = poolAddressFromLpTokenRes
    .filter((res) => res.success)
    .map((res) => res.output);

  for (let i = 0; i < lpTokens.length; i++) {
    const lpToken = lpTokens[i];

    const pool: Contract = {
      ...lpToken,
      //   address: poolInfo[i].token,
      address: poolInfo[i].crvRewards,
      poolAddress: poolAddressFromLpToken[i],
      lpToken: poolInfo[i].lptoken,
      rewards: poolInfo[i].crvRewards,
    };
    pools.push(pool);
  }
  console.log(pools);

  return pools.filter(isNotNullish);
}

export async function getPoolsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];
  const pools: Contract[] = [];

  const nonEmptyPools: Contract[] = (
    await getERC20BalanceOf(ctx, chain, contracts as Token[])
  ).filter((pool) => pool.amount.gt(0));

  //     console.log(nonEmptyPools);

  //   const calls = nonEmptyPools.map((pool) => ({
  //     target: MetaRegistry.address,
  //     params: [pool.poolAddress],
  //   }));

  //   const [
  //     coinsAddressesResponse,
  //     underlyingsAddressesResponse,
  //     rewardsEarnedRes,
  //     extraRewardsRes,
  //   ] = await Promise.all([
  //     multicall({
  //       chain,
  //       calls,
  //       abi: {
  //         stateMutability: "view",
  //         type: "function",
  //         name: "get_coins",
  //         inputs: [{ name: "_pool", type: "address" }],
  //         outputs: [{ name: "", type: "address[8]" }],
  //       },
  //     }),

  //     multicall({
  //       chain,
  //       calls,
  //       abi: {
  //         stateMutability: "view",
  //         type: "function",
  //         name: "get_underlying_coins",
  //         inputs: [{ name: "_pool", type: "address" }],
  //         outputs: [{ name: "", type: "address[8]" }],
  //       },
  //     }),

  //     multicall({
  //       chain,
  //       calls: nonEmptyPools.map((pool) => ({
  //         target: pool.address,
  //         params: [ctx.address],
  //       })),
  //       abi: {
  //         inputs: [
  //           {
  //             internalType: "address",
  //             name: "account",
  //             type: "address",
  //           },
  //         ],
  //         name: "earned",
  //         outputs: [
  //           {
  //             internalType: "uint256",
  //             name: "",
  //             type: "uint256",
  //           },
  //         ],
  //         stateMutability: "view",
  //         type: "function",
  //       },
  //     }),

  //     multicall({
  //       chain,
  //       calls: nonEmptyPools.map((pool) => ({
  //         target: pool.address,
  //         params: [],
  //       })),
  //       abi: {
  //         inputs: [],
  //         name: "extraRewardsLength",
  //         outputs: [
  //           {
  //             internalType: "uint256",
  //             name: "",
  //             type: "uint256",
  //           },
  //         ],
  //         stateMutability: "view",
  //         type: "function",
  //       },
  //     }),
  //   ]);

  //   const coinsAddressesRes = coinsAddressesResponse
  //     .filter((res) => res.success)
  //     .map((res) => res.output);

  //   const underlyingsAddressesRes = underlyingsAddressesResponse
  //     .filter((res) => res.success)
  //     .map((res) => res.output);

  //   const rewardsEarned = rewardsEarnedRes
  //     .filter((res) => res.success)
  //     .map((res) => BigNumber.from(res.output));

  //   const extraRewards = extraRewardsRes
  //     .filter((res) => res.success)
  //     .map((res) => BigNumber.from(res.output));

  //   const coinsAddresses = [];
  //   const underlyingsAddresses = [];

  //   for (let i = 0; i < coinsAddressesRes.length; i++) {
  //     /**
  //      *  Retrieve underlyings & coins used from pools
  //      */

  //     coinsAddresses.push(
  //       coinsAddressesRes[i]
  //         .filter(
  //           (coin: string) => coin.toLowerCase() !== ethers.constants.AddressZero
  //         )
  //         .map((coin: string) =>
  //           coin.toLowerCase() === ETH_ADDR
  //             ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  //             : coin
  //         )
  //     );
  //     underlyingsAddresses.push(
  //       underlyingsAddressesRes[i]
  //         .filter(
  //           (coin: string) => coin.toLowerCase() !== ethers.constants.AddressZero
  //         )
  //         .map((coin: string) =>
  //           coin.toLowerCase() === ETH_ADDR
  //             ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  //             : coin
  //         )
  //     );

  //     pools.push({
  //       ...nonEmptyPools[i],
  //       tokens: coinsAddresses[i],
  //       underlyings: underlyingsAddresses[i],
  //     });

  //     const [totalSupplyRes, underlyingsBalancesRes] = await Promise.all([
  //       call({
  //         chain,
  //         target: pools[i].lpToken,
  //         params: [],
  //         abi: {
  //           stateMutability: "view",
  //           type: "function",
  //           name: "totalSupply",
  //           inputs: [],
  //           outputs: [
  //             {
  //               name: "",
  //               type: "uint256",
  //             },
  //           ],
  //           gas: 3240,
  //         },
  //       }),

  //       call({
  //         chain,
  //         target: MetaRegistry.address,
  //         params: [pools[i].poolAddress],
  //         abi: {
  //           stateMutability: "view",
  //           type: "function",
  //           name: "get_underlying_balances",
  //           inputs: [{ name: "_pool", type: "address" }],
  //           outputs: [{ name: "", type: "uint256[8]" }],
  //         },
  //       }),
  //     ]);

  //     const underlyingsBalances: BigNumber[] = underlyingsBalancesRes.output.map(
  //       (res: string) => BigNumber.from(res)
  //     );

  //     underlyingsBalances.filter((amount) => amount.gt(0));

  //     const totalSupply = BigNumber.from(totalSupplyRes.output);

  //     const token = await getERC20Details(chain, pools[i].tokens);

  //     pools[i].underlyings = await getERC20Details(
  //       chain,
  //       pools[i].underlyings as any
  //     );

  //     /**
  //      *  Updating pool amounts from the fraction of each underlyings
  //      */

  //     const formattedUnderlyings = pools[i].underlyings?.map((underlying, x) => ({
  //       ...underlying,
  //       amount:
  //         underlying.decimals &&
  //         pools[i].amount.mul(underlyingsBalances[x]).div(totalSupply),
  //       decimals: underlying.decimals,
  //     }));

  //     const balance: BalanceWithExtraProps = {
  //       chain,
  //       address: pools[i].address,
  //       amount: pools[i].amount,
  //       symbol: token.map((coin) => coin.symbol).join("-"),
  //       tokens: token.map((coin) => coin),
  //       underlyings: formattedUnderlyings,
  //       decimals: 18,
  //       category: "stake",
  //       yieldKey: pools[i].lpToken,
  //     };

  //     /**
  //      *  Rewards logics
  //      */

  //     if (rewardsEarned[i].gt(0)) {
  //       const formattedRewards: any = await getCVXRatio(
  //         chain,
  //         CVX,
  //         rewardsEarned[i]
  //       );

  //       balance.rewards = [
  //         { ...CRV, amount: rewardsEarned[i] },
  //         { ...CVX, amount: formattedRewards },
  //       ];
  //     }

  //     balances.push(balance);
  //   }
  //   console.log(balances);

  //   return balances;
}
