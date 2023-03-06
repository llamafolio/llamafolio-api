// import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
// import { call } from '@lib/call'
// import { abi as erc20Abi } from '@lib/erc20'
// import { BN_ZERO, isZero } from '@lib/math'
// import { Call, multicall } from '@lib/multicall'
// import { ETH_ADDR } from '@lib/token'
// import { isSuccess } from '@lib/type'
// import { BigNumber, ethers, utils } from 'ethers'

// const abi = {
//   token0: {
//     constant: true,
//     inputs: [],
//     name: 'token0',
//     outputs: [{ internalType: 'address', name: '', type: 'address' }],
//     payable: false,
//     stateMutability: 'view',
//     type: 'function',
//   },
//   token1: {
//     constant: true,
//     inputs: [],
//     name: 'token1',
//     outputs: [{ internalType: 'address', name: '', type: 'address' }],
//     payable: false,
//     stateMutability: 'view',
//     type: 'function',
//   },
//   uni_token0: {
//     inputs: [],
//     name: 'uni_token0',
//     outputs: [{ internalType: 'address', name: '', type: 'address' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   uni_token1: {
//     inputs: [],
//     name: 'uni_token1',
//     outputs: [{ internalType: 'address', name: '', type: 'address' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   convexPoolId: {
//     inputs: [],
//     name: 'convexPoolId',
//     outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   poolInfo: {
//     inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
//     name: 'poolInfo',
//     outputs: [
//       { internalType: 'address', name: 'lptoken', type: 'address' },
//       { internalType: 'address', name: 'token', type: 'address' },
//       { internalType: 'address', name: 'gauge', type: 'address' },
//       { internalType: 'address', name: 'crvRewards', type: 'address' },
//       { internalType: 'address', name: 'stash', type: 'address' },
//       { internalType: 'bool', name: 'shutdown', type: 'bool' },
//     ],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   get_pool_from_lp_token: {
//     stateMutability: 'view',
//     type: 'function',
//     name: 'get_pool_from_lp_token',
//     inputs: [{ name: '_token', type: 'address' }],
//     outputs: [{ name: '', type: 'address' }],
//   },
//   get_underlying_coins: {
//     stateMutability: 'view',
//     type: 'function',
//     name: 'get_underlying_coins',
//     inputs: [{ name: '_pool', type: 'address' }],
//     outputs: [{ name: '', type: 'address[8]' }],
//   },
//   curveLPToken: {
//     inputs: [],
//     name: 'curveLPToken',
//     outputs: [{ internalType: 'contract ICurve', name: '', type: 'address' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   get_underlying_balances: {
//     stateMutability: 'view',
//     type: 'function',
//     name: 'get_underlying_balances',
//     inputs: [{ name: '_pool', type: 'address' }],
//     outputs: [{ name: '', type: 'uint256[8]' }],
//   },
//   lp_pool: {
//     inputs: [],
//     name: 'lp_pool',
//     outputs: [{ internalType: 'contract IUniswapV3Pool', name: '', type: 'address' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   liquidity: {
//     inputs: [],
//     name: 'liquidity',
//     outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   getUnderlyingBalances: {
//     inputs: [],
//     name: 'getUnderlyingBalances',
//     outputs: [
//       { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
//       { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
//     ],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   pricePerShare: {
//     inputs: [],
//     name: 'pricePerShare',
//     outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   getPricePerFullShare: {
//     constant: true,
//     inputs: [],
//     name: 'getPricePerFullShare',
//     outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
//     payable: false,
//     stateMutability: 'view',
//     type: 'function',
//   },
// }

// const convexBooster: Contract = {
//   chain: 'ethereum',
//   address: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
// }

// const metaRegistry: Contract = {
//   chain: 'ethereum',
//   address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
// }

// export interface ProviderBalancesParams extends Balance {
//   amount: BigNumber
//   totalSupply: BigNumber
//   lpToken: string
//   provider: string
//   curvePool?: string
// }

// export const uniswapProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   const calls: Call[] = pools.map((pool) => ({
//     target: pool.lpToken,
//     params: [],
//   }))

//   const [token0sRes, token1sRes] = await Promise.all([
//     multicall({ ctx, calls, abi: abi.token0 }),
//     multicall({ ctx, calls, abi: abi.token1 }),
//   ])

//   pools.forEach((pool, idx) => {
//     const token0Res = token0sRes[idx]
//     const token1Res = token1sRes[idx]

//     if (!isSuccess(token0Res) || !isSuccess(token1Res)) {
//       return
//     }

//     res.push({ ...pool, underlyings: [token0Res.output, token1Res.output] })
//   })

//   return res
// }

// export const uniswap3Provider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   const calls: Call[] = pools.map((pool) => ({ target: pool.lpToken }))

//   const [token0sRes, token1sRes, lpTokensRes] = await Promise.all([
//     multicall({ ctx, calls, abi: abi.uni_token0 }),
//     multicall({ ctx, calls, abi: abi.uni_token1 }),
//     multicall({ ctx, calls, abi: abi.lp_pool }),
//   ])

//   pools.forEach((pool, idx) => {
//     const token0Res = token0sRes[idx]
//     const token1Res = token1sRes[idx]
//     const lpTokenRes = lpTokensRes[idx]

//     if (!isSuccess(token0Res) || !isSuccess(token1Res) || !isSuccess(lpTokenRes)) {
//       return
//     }
//     res.push({ ...pool, underlyings: [token0Res.output, token1Res.output], lpToken: lpTokenRes.output })
//   })

//   return res
// }

// export const aaveProvider = async (_ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   for (const pool of pools) {
//     res.push({ ...pool, underlyings: ['0x853d955aCEf822Db058eb8505911ED77F175b99e'] })
//   }

//   return res
// }

// export const curveProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   const underlyingsRes = await multicall({
//     ctx,
//     calls: pools.map((pool) => ({
//       target: metaRegistry.address,
//       params: [pool.curvePool],
//     })),
//     abi: abi.get_underlying_coins,
//   })

//   pools.forEach((pool, idx) => {
//     const underlyingRes = underlyingsRes[idx]

//     res.push({
//       ...pool,
//       curveLpToken: pool.curvePool,
//       underlyings: underlyingRes.output
//         .map((address: string) => address.toLowerCase())
//         // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
//         .filter((address: string) => address !== ethers.constants.AddressZero)
//         // replace ETH alias
//         .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
//     })
//   })

//   return res
// }

// export const convexProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   const poolIdsRes = await multicall({
//     ctx,
//     calls: pools.map((pool) => ({ target: pool.lpToken })),
//     abi: abi.convexPoolId,
//   })

//   const curveLpTokensRes = await multicall({
//     ctx,
//     calls: poolIdsRes.map((poolId) => ({
//       target: convexBooster.address,
//       params: [isSuccess(poolId) ? poolId.output : null],
//     })),
//     abi: abi.poolInfo,
//   })

//   const curvePoolsRes = await multicall({
//     ctx,
//     calls: curveLpTokensRes.map((lpToken) => ({
//       target: metaRegistry.address,
//       params: [isSuccess(lpToken) ? lpToken.output.lptoken : null],
//     })),
//     abi: abi.get_pool_from_lp_token,
//   })

//   const underlyingsRes = await multicall({
//     ctx,
//     calls: curvePoolsRes.map((poolAddress) => ({
//       target: metaRegistry.address,
//       params: [isSuccess(poolAddress) ? poolAddress.output : null],
//     })),
//     abi: abi.get_underlying_coins,
//   })

//   pools.forEach((pool, idx) => {
//     const poolIdRes = poolIdsRes[idx]
//     const curveLpToken = curveLpTokensRes[idx]
//     const curvePoolRes = curvePoolsRes[idx]
//     const underlyingRes = underlyingsRes[idx]

//     res.push({
//       ...pool,
//       poolId: poolIdRes.output,
//       curveLpToken: curveLpToken.output.lptoken,
//       curvePool: curvePoolRes.output,
//       underlyings: underlyingRes.output
//         .map((address: string) => address.toLowerCase())
//         // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
//         .filter((address: string) => address !== ethers.constants.AddressZero)
//         // replace ETH alias
//         .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
//     })
//   })

//   return res
// }

// export const stakedaoProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   const curveLpTokensRes = await multicall({
//     ctx,
//     calls: pools.map((pool) => ({
//       target: pool.lpToken,
//     })),
//     abi: abi.curveLPToken,
//   })

//   const curvePoolsRes = await multicall({
//     ctx,
//     calls: curveLpTokensRes.map((lpToken) => ({
//       target: metaRegistry.address,
//       params: [isSuccess(lpToken) ? lpToken.output : null],
//     })),
//     abi: abi.get_pool_from_lp_token,
//   })

//   const underlyingsRes = await multicall({
//     ctx,
//     calls: curvePoolsRes.map((poolAddress) => ({
//       target: metaRegistry.address,
//       params: [isSuccess(poolAddress) ? poolAddress.output : null],
//     })),
//     abi: abi.get_underlying_coins,
//   })

//   pools.forEach((pool, idx) => {
//     const curveLpToken = curveLpTokensRes[idx]
//     const curvePoolRes = curvePoolsRes[idx]
//     const underlyingRes = underlyingsRes[idx]

//     res.push({
//       ...pool,
//       curveLpToken: curveLpToken.output,
//       curvePool: curvePoolRes.output,
//       underlyings: underlyingRes.output
//         .map((address: string) => address.toLowerCase())
//         // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
//         .filter((address: string) => address !== ethers.constants.AddressZero)
//         // replace ETH alias
//         .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
//     })
//   })

//   return res
// }

// export const fraxpoolProvider = async (_ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
//   const res: Contract[] = []

//   for (const pool of pools) {
//     res.push({ ...pool, underlyings: ['0x853d955aCEf822Db058eb8505911ED77F175b99e'] })
//   }

//   return res
// }

// export const aaveBalancesProvider = async (
//   _ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   return pools
// }

// export const arrakisBalancesProvider = async (
//   ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
//     multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: abi.getUnderlyingBalances }),
//     multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
//   ])

//   for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
//     const pool = pools[poolIdx]
//     const { underlyings, amount } = pool
//     const totalSupplyRes = totalSuppliesRes[poolIdx]
//     const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

//     if (!underlyings || !amount || !underlyingsBalanceRes || !totalSupplyRes || isZero(totalSupplyRes.output)) {
//       continue
//     }

//     ;(underlyings[0] as Balance).amount = BigNumber.from(underlyingsBalanceRes.output.amount0Current)
//       .mul(amount)
//       .div(totalSupplyRes.output)
//     ;(underlyings[1] as Balance).amount = BigNumber.from(underlyingsBalanceRes.output.amount1Current)
//       .mul(amount)
//       .div(totalSupplyRes.output)
//   }

//   return pools
// }

// export const uniswapBalancesProvider = async (
//   ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   const res: ProviderBalancesParams[] = []

//   const underlyingsCalls: Call[] = []

//   for (const pool of pools) {
//     const { underlyings, lpToken } = pool
//     if (!underlyings) {
//       continue
//     }

//     for (const underlying of underlyings) {
//       underlyingsCalls.push({ target: underlying.address, params: [lpToken] })
//     }
//   }

//   const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
//     multicall({ ctx, calls: underlyingsCalls, abi: erc20Abi.balanceOf }),
//     multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
//   ])

//   let balanceOfIdx = 0
//   for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
//     const pool = pools[poolIdx]
//     const { underlyings, amount } = pool
//     const totalSupplyRes = totalSuppliesRes[poolIdx]
//     if (!underlyings || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
//       continue
//     }

//     underlyings.forEach((underlying) => {
//       const underlyingBalanceOfRes = underlyingsBalancesRes[balanceOfIdx]

//       const underlyingsBalance =
//         isSuccess(underlyingBalanceOfRes) && underlyingBalanceOfRes.output != undefined
//           ? BigNumber.from(underlyingBalanceOfRes.output)
//           : BN_ZERO

//       ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupplyRes.output)

//       balanceOfIdx++
//     })

//     res.push(pool)
//   }

//   return res
// }

// export const uniswap3BalancesProvider = async (
//   ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   const underlyingsCalls: Call[] = []
//   const suppliesCalls: Call[] = []

//   for (const pool of pools) {
//     const { underlyings, lpToken } = pool
//     pool.symbol = `UNI-V3`

//     if (!underlyings || !lpToken) {
//       continue
//     }

//     underlyingsCalls.push(...underlyings.map((underlying) => ({ target: underlying.address, params: [lpToken] })))
//     suppliesCalls.push({ target: lpToken })
//   }

//   const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
//     multicall({ ctx, calls: underlyingsCalls, abi: erc20Abi.balanceOf }),
//     multicall({ ctx, calls: suppliesCalls, abi: abi.liquidity }),
//   ])

//   for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
//     const pool = pools[poolIdx]
//     const { underlyings, amount } = pool
//     const totalSupplyRes = totalSuppliesRes[poolIdx]

//     if (!underlyings || !amount || !totalSupplyRes || isZero(totalSupplyRes.output)) {
//       continue
//     }

//     underlyings.forEach((underlying, underlyingIdx) => {
//       const underlyingsBalanceRes = underlyingsBalancesRes[underlyingIdx]

//       const underlyingsBalance = isSuccess(underlyingsBalanceRes)
//         ? BigNumber.from(underlyingsBalanceRes.output)
//         : BN_ZERO

//       ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupplyRes.output)
//     })
//   }

//   return pools
// }

// export const convexBalancesProvider = async (
//   ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   for (const pool of pools) {
//     if (pool.provider === 'curve') {
//       const { output: pricePerShare } = await call({ ctx, target: pool.lpToken, abi: abi.getPricePerFullShare })
//       pool.amount = pool.amount.mul(pricePerShare).div(utils.parseEther('1.0'))
//     }
//   }

//   const underlyingsCalls: Call[] = pools.map((pool) => ({ target: metaRegistry.address, params: [pool.curvePool!] }))
//   const suppliesCalls: Call[] = pools.map((pool: Contract) => ({ target: pool.curveLpToken }))

//   const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
//     multicall({ ctx, calls: underlyingsCalls, abi: abi.get_underlying_balances }),
//     multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
//   ])

//   for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
//     const pool = pools[poolIdx]
//     const { underlyings, amount } = pool
//     const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]
//     const totalSupplyRes = totalSuppliesRes[poolIdx]

//     if (
//       !underlyings ||
//       !isSuccess(underlyingsBalanceRes) ||
//       !isSuccess(totalSupplyRes) ||
//       isZero(totalSupplyRes.output)
//     ) {
//       continue
//     }

//     underlyings.forEach((underlying, underlyingIdx) => {
//       const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
//       ;(underlying as Balance).amount =
//         BigNumber.from(underlyingBalance).mul(amount).div(totalSupplyRes.output) || BN_ZERO
//     })
//   }

//   return pools
// }

// export const fraxpoolBalancesProvider = async (
//   ctx: BalancesContext,
//   pools: ProviderBalancesParams[],
// ): Promise<ProviderBalancesParams[]> => {
//   const fmtBalancesOfRes = await multicall({
//     ctx,
//     calls: pools.map((pool) => ({ target: pool.lpToken })),
//     abi: abi.pricePerShare,
//   })

//   for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
//     const pool = pools[poolIdx]
//     const fmtBalanceOfRes = fmtBalancesOfRes[poolIdx]

//     if (!isSuccess(fmtBalanceOfRes)) {
//       continue
//     }

//     pool.amount = pool.amount.mul(fmtBalanceOfRes.output).div(utils.parseEther('1.0'))
//   }

//   return pools
// }
