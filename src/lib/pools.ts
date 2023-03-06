import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicallBalances } from '@lib/balance'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

export interface GetPoolsBalancesParams {
  getPoolAddress: (contract: Contract) => string
}

/**
 * @param ctx
 * @param pools address: LP token address
 * @param params
 */
export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[], params: GetPoolsBalancesParams) {
  const nonEmptyPools = pools.filter((pool) => pool.amount && pool.amount.gt(0)) as Balance[]

  return getPoolsUnderlyingBalances(ctx, nonEmptyPools, params)
}

export async function getPoolsUnderlyingBalances(
  ctx: BalancesContext,
  pools: Balance[],
  params: GetPoolsBalancesParams,
) {
  const res: Balance[] = []
  const { getPoolAddress } = params

  const balanceOfCalls: Call[] = []

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
    multicall({
      ctx,
      calls: pools.map((token) => ({
        params: [],
        target: token.address,
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicallBalances({
      ctx,
      calls: balanceOfCalls,
      abi: erc20Abi.balanceOf,
    }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      // next pool
      balanceOfIdx += underlyings.length
      continue
    }

    const poolAmount = pools[poolIdx].amount
    const poolTotalSupply = BigNumber.from(totalSupplyRes.output)

    const poolBalance: Balance = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceRes = underlyingsBalanceOfRes[balanceOfIdx]
      // fallback to 0 in case of failure, better than not showing anything at all
      const underlyingBalance = isSuccess(underlyingBalanceRes) ? BigNumber.from(underlyingBalanceRes.output) : BN_ZERO

      const underlyingAmount = underlyingBalance.mul(poolAmount).div(poolTotalSupply)

      poolBalance.underlyings!.push({ ...underlyings[underlyingIdx], amount: underlyingAmount })

      balanceOfIdx++
    }

    res.push(poolBalance)
  }

  return res
}

export interface GetStakingPoolsBalancesParams extends GetPoolsBalancesParams {
  getLPTokenAddress: (contract: Contract) => string
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
      calls: poolsBalances.map((pool) => ({
        params: [],
        target: getLPTokenAddress(pool),
      })),
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

    if (!isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output) || !isSuccess(stakingTokenBalanceRes)) {
      continue
    }

    const totalSupply = BigNumber.from(totalSupplyRes.output)
    const amount = BigNumber.from(stakingTokenBalanceRes.output)
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
        amount: BigNumber.from(underlying.amount).mul(amount).div(totalSupply),
      })),
    }

    stakingPoolsBalances.push(stakingBalance)
  }

  return stakingPoolsBalances
}
