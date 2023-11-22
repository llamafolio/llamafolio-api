// BALANCE

// export async function getUnderlyingsPoolsBalances(
//   ctx: BalancesContext,
//   rawPoolBalances: Balance[],
// ): Promise<Balance[]> {
//   const registries = await getCurveRegistriesIds(ctx)
//   const urls = registries.map((registry: string) => `https://api.curve.fi/api/getPools/${ctx.chain}/${registry}`)

//   const datasPromises = urls.map((url: any) => fetch(url).then((res) => res.json()))
//   const allDatas = await Promise.all(datasPromises)

//   const processCoin = ({ poolBalance }: any) => ({
//     poolBalance,
//   })

//   const pools = Array.from(
//     new Map(
//       allDatas
//         .flatMap(({ data: { poolData } }) =>
//           poolData.map(({ address, coins, underlyingCoins, totalSupply, isMetaPool }: any) => ({
//             address,
//             coinsBalance: isMetaPool ? underlyingCoins.map(processCoin) : coins.map(processCoin),
//             totalSupply,
//           })),
//         )
//         .map((contract) => [contract.address, contract]),
//     ).values(),
//   )

//   return rawPoolBalances
//     .map((rawPool) => {
//       const matchingPool = pools.find((p) => p.address === rawPool.address)
//       const underlyings = rawPool.underlyings as Contract[]

//       if (!matchingPool || !underlyings) return null

//       underlyings.forEach((underlying, index) => {
//         underlying.amount =
//           (rawPool.amount * BigInt(matchingPool.coinsBalance[index].poolBalance)) / BigInt(matchingPool.totalSupply)
//       })

//       return {
//         ...rawPool,
//         underlyings,
//         rewards: undefined,
//         category: 'lp' as Category,
//       }
//     })
//     .filter(isNotNullish)
// }

// POOL

// export async function getCurvePools(ctx: BaseContext): Promise<Contract[]> {
//   const registries = await getCurveRegistriesIds(ctx)
//   const urls = registries.map((registry: string) => `https://api.curve.fi/api/getPools/${ctx.chain}/${registry}`)

//   const datasPromises = urls.map((url: any) => fetch(url).then((res) => res.json()))
//   const allDatas = await Promise.all(datasPromises)

//   const processCoin = ({ address: underlyingAddress, symbol, isBasePoolLpToken }: any) => ({
//     chain: ctx.chain,
//     address: underlyingAddress,
//     symbol,
//     isBasePoolLpToken,
//   })

//   const processReward = ({ tokenAddress, decimals, symbol }: any) => ({
//     chain: ctx.chain,
//     address: tokenAddress,
//     decimals,
//     symbol,
//   })

//   return Array.from(
//     new Map(
//       allDatas
//         .flatMap(({ data: { poolData } }) =>
//           poolData.map(
//             ({
//               address,
//               lpTokenAddress,
//               coins,
//               gaugeAddress,
//               gaugeRewards,
//               isMetaPool,
//               underlyingCoins,
//               isBroken,
//             }: any) => {
//               return {
//                 chain: ctx.chain,
//                 address,
//                 token: lpTokenAddress,
//                 gauge: gaugeAddress,
//                 underlyings: isMetaPool ? underlyingCoins.map(processCoin) : coins.map(processCoin),
//                 rewards: (gaugeRewards || []).map(processReward),
//                 isBroken,
//               }
//             },
//           ),
//         )
//         .filter((contract) => contract.isBroken === false)
//         .map((contract) => [contract.address, contract]),
//     ).values(),
//   )
// }

// const pools = Array.from(
//   new Map(
//     allDatas
//       .flatMap(({ data: { poolData } }) =>
//         poolData.map(
//           ({ address, lpTokenAddress, coins, gaugeAddress, gaugeRewards, isMetaPool, underlyingCoins }: any) => ({
//             chain: ctx.chain,
//             address,
//             token: lpTokenAddress,
//             gauge: gaugeAddress,
//             underlyings: coins.map(processCoin),
//             rewards: (gaugeRewards || []).map(processReward),
//           }),
//         ),
//       )
//       .map((contract) => [contract.address, contract]),
//   ).values(),
// )

// pools.forEach((pool) => {
//   pool.underlyings = pool.underlyings.flatMap((underlying: Contract) => {
//     if (underlying.isBasePoolLpToken) {
//       const matchingPool = pools.find((p) => p.token === underlying.address)
//       return matchingPool ? matchingPool.underlyings : [underlying]
//     } else {
//       return [underlying]
//     }
//   })
// })

// BALANCEOF

// export async function getCurvePoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
//   const userBalancesRes = await multicall({
//     ctx,
//     calls: pools.map((pool) => ({ target: pool.token!, params: [ctx.address] }) as const),
//     abi: erc20Abi.balanceOf,
//   })

//   const poolBalances: Balance[] = mapSuccessFilter(userBalancesRes, (res, index) => {
//     if (res.output === 0n) return null

//     return { ...(pools[index] as Balance), amount: res.output }
//   }).filter(isNotNullish)

//   return getUnderlyingsPoolsBalances(ctx, poolBalances)
// }
