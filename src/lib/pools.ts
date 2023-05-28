import type { Balance, BalancesContext, BaseBalance, Contract } from '@lib/adapter'
import { multicallBalances } from '@lib/balance'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

export interface GetPoolsBalancesParams {
  getPoolAddress: (contract: Contract) => `0x${string}`
}

/**
 * @param ctx
 * @param pools address: LP token address
 * @param params
 */
export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[], params: GetPoolsBalancesParams) {
  const poolsBalances = await getERC20BalanceOf(ctx, pools as Token[])

  return getPoolsUnderlyingBalances(ctx, poolsBalances, params)
}

export async function getPoolsUnderlyingBalances(
  ctx: BalancesContext,
  pools: Balance[],
  params: GetPoolsBalancesParams,
) {
  const res: Balance[] = []
  const { getPoolAddress } = params

  const balanceOfCalls: Call<typeof erc20Abi.balanceOf>[] = []

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      balanceOfCalls.push({
        target: underlyings[underlyingIdx].address,
        params: [getPoolAddress(pools[poolIdx])],
      })
    }
  }

  const [totalSuppliesRes, underlyingsBalanceOfRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((token) => ({ target: token.address })), abi: erc20Abi.totalSupply }),
    multicallBalances({ ctx, calls: balanceOfCalls, abi: erc20Abi.balanceOf }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!totalSupplyRes.success || totalSupplyRes.output === 0n) {
      // next pool
      balanceOfIdx += underlyings.length
      continue
    }

    const poolAmount = pools[poolIdx].amount
    const poolTotalSupply = totalSupplyRes.output

    const poolBalance: Balance = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceRes = underlyingsBalanceOfRes[balanceOfIdx]
      // fallback to 0 in case of failure, better than not showing anything at all
      const underlyingBalance: bigint = underlyingBalanceRes.success ? underlyingBalanceRes.output : 0n

      const underlyingAmount = (underlyingBalance * poolAmount) / poolTotalSupply

      poolBalance.underlyings!.push({ ...underlyings[underlyingIdx], amount: underlyingAmount })

      balanceOfIdx++
    }

    res.push(poolBalance)
  }

  return res
}

export interface GetStakingPoolsBalancesParams extends GetPoolsBalancesParams {
  getLPTokenAddress: (contract: Contract) => `0x${string}`
}

/**
 * @param ctx
 * @param pools address: staking token address
 * @param params
 */
export async function getStakingPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  params: GetStakingPoolsBalancesParams,
) {
  const { getLPTokenAddress } = params
  const stakingPoolsBalances: Balance[] = []

  const poolsBalances = await getPoolsBalances(ctx, pools, params)

  const [totalSuppliesRes, stakingTokenBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolsBalances.map((pool) => ({ target: getLPTokenAddress(pool) })),
      abi: erc20Abi.totalSupply,
    }),

    multicallBalances({
      ctx,
      calls: poolsBalances.map((pool) => ({
        params: [pool.address],
        target: getLPTokenAddress(pool),
      })),
      abi: erc20Abi.balanceOf,
    }),
  ])

  for (let poolIdx = 0; poolIdx < poolsBalances.length; poolIdx++) {
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const stakingTokenBalanceRes = stakingTokenBalancesRes[poolIdx]

    if (!totalSupplyRes.success || totalSupplyRes.output === 0n || !stakingTokenBalanceRes.success) {
      continue
    }

    const totalSupply = totalSupplyRes.output
    const amount = stakingTokenBalanceRes.output
    const underlyings = poolsBalances[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const stakingBalance: Balance = {
      ...poolsBalances[poolIdx],
      category: 'stake',
      amount,
      // adjust amounts with staking token ratio
      underlyings: underlyings.map((underlying) => ({
        ...underlying,
        amount: ((underlying as BaseBalance).amount * amount) / totalSupply,
      })),
    }

    stakingPoolsBalances.push(stakingBalance)
  }

  return stakingPoolsBalances
}
