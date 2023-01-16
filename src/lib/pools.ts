import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

import { groupBy } from './array'

export interface GetPoolsBalancesParams {
  getPoolAddress: (contract: Contract) => string
}

export interface PoolsBalances extends Balance {
  registryId?: string
  totalSupply: BigNumber
  lpToken: string
}

const abi = {
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  },
  get_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 39733,
  },
  get_underlyings_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 19730,
  },
}

/**
 * @param ctx
 * @param pools address: LP token address
 * @param params
 */
export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[] /*, params: GetPoolsBalancesParams */) {
  const poolsBalances = await getERC20BalanceOf(ctx, pools as Token[])

  const poolsByRegistryId = groupBy(poolsBalances as PoolsBalances[], 'registryId')

  const stablePools = [...poolsByRegistryId.stableSwap, ...poolsByRegistryId.stableFactory]
  const cryptoPools = [...poolsByRegistryId.cryptoSwap, ...poolsByRegistryId.cryptoFactory]

  const underlyingsBalances = await Promise.all([
    getUnderlyingBalancesFromStablePools(ctx, stablePools /*, params*/),
    getUnderlyingBalancesFromCryptoPools(ctx, cryptoPools /*, params*/),
  ])

  return underlyingsBalances.flat()
}

const getUnderlyingBalancesFromStablePools = async (
  ctx: BalancesContext,
  pools: PoolsBalances[],
  // params: GetPoolsBalancesParams,
) => {
  const res: Balance[] = []

  const calls: Call[] = []

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    calls.push({
      target: (pools[poolIdx] as Contract).registry,
      params: [(pools[poolIdx] as Contract).pool],
    })
  }

  const [totalSuppliesRes, underlyingsBalanceOfStableRes, underlyingsDecimalsStableRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((token) => ({
        params: [],
        target: token.lpToken,
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicall({ ctx, calls, abi: abi.get_underlying_balances }),

    multicall({ ctx, calls, abi: abi.get_underlyings_decimals }),
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

    const totalSupply = BigNumber.from(totalSupplyRes.output)

    const poolBalance: PoolsBalances = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
      totalSupply,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceOfStableRes = underlyingsBalanceOfStableRes[balanceOfIdx]
      const underlyingDecimalsStableRes = underlyingsDecimalsStableRes[balanceOfIdx]

      const underlyingsBalance =
        isSuccess(underlyingBalanceOfStableRes) && underlyingBalanceOfStableRes.output[underlyingIdx] != undefined
          ? BigNumber.from(underlyingBalanceOfStableRes.output[underlyingIdx])
          : BN_ZERO

      const underlyingsDecimals =
        isSuccess(underlyingDecimalsStableRes) && underlyingDecimalsStableRes.output[underlyingIdx] != undefined
          ? underlyingDecimalsStableRes.output[underlyingIdx]
          : 18

      poolBalance.underlyings?.push({
        ...underlyings[underlyingIdx],
        decimals: underlyingsDecimals,
        amount: underlyingsBalance.mul(poolBalance.amount).div(poolBalance.totalSupply),
      })
    }

    res.push(poolBalance)
    balanceOfIdx++
  }

  return res
}

const getUnderlyingBalancesFromCryptoPools = async (
  ctx: BalancesContext,
  pools: PoolsBalances[],
  // params: GetPoolsBalancesParams,
) => {
  const res: Balance[] = []

  const calls: Call[] = []

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    calls.push({
      target: (pools[poolIdx] as Contract).registry,
      params: [(pools[poolIdx] as Contract).pool],
    })
  }

  const [totalSuppliesRes, underlyingsBalanceOfCryptoRes, underlyingsDecimalsCryptoRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((token) => ({
        params: [],
        target: token.address,
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicall({
      ctx,
      calls,
      abi: abi.get_balances,
    }),

    multicall({
      ctx,
      calls,
      abi: abi.get_decimals,
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
      balanceOfIdx += underlyings.length
      continue
    }

    const totalSupply = BigNumber.from(totalSupplyRes.output)

    const poolBalance: PoolsBalances = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
      totalSupply,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceOfCryptoRes = underlyingsBalanceOfCryptoRes[balanceOfIdx]
      const underlyingDecimalsCryptoRes = underlyingsDecimalsCryptoRes[balanceOfIdx]

      const underlyingsBalance =
        isSuccess(underlyingBalanceOfCryptoRes) && underlyingBalanceOfCryptoRes.output[underlyingIdx] != undefined
          ? BigNumber.from(underlyingBalanceOfCryptoRes.output[underlyingIdx])
          : BN_ZERO

      const underlyingsDecimals =
        isSuccess(underlyingDecimalsCryptoRes) && underlyingDecimalsCryptoRes.output[underlyingIdx] != undefined
          ? underlyingDecimalsCryptoRes.output[underlyingIdx]
          : 18

      poolBalance.underlyings?.push({
        ...underlyings[underlyingIdx],
        decimals: underlyingsDecimals,
        amount: underlyingsBalance.mul(poolBalance.amount).div(poolBalance.totalSupply),
      })
    }

    res.push(poolBalance)
    balanceOfIdx++
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

  const poolsBalances = await getPoolsBalances(ctx, pools /*, params */)

  return poolsBalances
}
