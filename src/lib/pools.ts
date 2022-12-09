import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicallBalances } from '@lib/balance'
import { Chain } from '@lib/chains'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

export interface GetPoolsBalancesParams {
  getPoolAddress: (contract: Contract) => string
}

/**
 *
 * @param ctx
 * @param chain
 * @param pools address: LP token address
 * @param params
 */
export async function getPoolsBalances(
  ctx: BalancesContext,
  chain: Chain,
  pools: Contract[],
  params: GetPoolsBalancesParams,
) {
  const poolsBalances = await getERC20BalanceOf(ctx, chain, pools as Token[])

  return getPoolsUnderlyingBalances(chain, poolsBalances, params)
}

export async function getPoolsUnderlyingBalances(chain: Chain, pools: Balance[], params: GetPoolsBalancesParams) {
  const res: Balance[] = []
  const { getPoolAddress } = params

  const calls: Call[] = []

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      calls.push({
        target: pools[poolIdx].underlyings![underlyingIdx].address,
        params: [getPoolAddress(pools[poolIdx])],
      })
    }
  }

  const [totalSuppliesRes, underlyingsBalanceOfRes] = await Promise.all([
    multicall({
      chain: chain,
      calls: pools.map((token) => ({
        params: [],
        target: token.address,
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicallBalances({
      chain,
      calls,
      abi: erc20Abi.balanceOf,
    }),
  ])

  let callIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!isSuccess(totalSupplyRes)) {
      // next pool
      callIdx += underlyings.length
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
      const underlyingBalanceRes = underlyingsBalanceOfRes[callIdx]
      // fallback to 0 in case of failure, better than not showing anything at all
      const underlyingBalance = isSuccess(underlyingBalanceRes) ? BigNumber.from(underlyingBalanceRes.output) : BN_ZERO

      const underlyingAmount = underlyingBalance.mul(poolAmount).div(poolTotalSupply)

      poolBalance.underlyings!.push({ ...pools[poolIdx]!.underlyings![underlyingIdx], amount: underlyingAmount })

      callIdx++
    }

    res.push(poolBalance)
  }

  return res
}

export interface GetStakingPoolsBalancesParams extends GetPoolsBalancesParams {
  getLPTokenAddress: (contract: Contract) => string
}

/**
 *
 * @param ctx
 * @param chain
 * @param pools address: staking token address
 * @param params
 */
export async function getStakingPoolsBalances(
  ctx: BalancesContext,
  chain: Chain,
  pools: Contract[],
  params: GetStakingPoolsBalancesParams,
) {
  const { getLPTokenAddress } = params
  const stakingPoolsBalances: Balance[] = []

  const poolsBalances = await getPoolsBalances(ctx, chain, pools, params)

  const [totalSuppliesRes, stakingTokenBalancesRes] = await Promise.all([
    multicall({
      chain,
      calls: poolsBalances.map((pool) => ({
        params: [],
        target: getLPTokenAddress(pool),
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicallBalances({
      chain,
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

    if (!isSuccess(totalSupplyRes || !isSuccess(stakingTokenBalanceRes))) {
      continue
    }

    const totalSupply = BigNumber.from(totalSupplyRes.output)
    const amount = BigNumber.from(stakingTokenBalanceRes.output)

    const stakingBalance: Balance = {
      ...poolsBalances[poolIdx],
      category: 'stake',
      amount,
      // adjust amounts with staking token ratio
      underlyings: poolsBalances[poolIdx].underlyings?.map((underlying) => ({
        ...underlying,
        amount: BigNumber.from(underlying.amount).mul(amount).div(totalSupply),
      })),
    }

    stakingPoolsBalances.push(stakingBalance)
  }

  return stakingPoolsBalances
}
