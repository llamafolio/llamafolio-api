import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    stateMutability: 'view',
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  REWARD_TOKEN: {
    inputs: [],
    name: 'REWARD_TOKEN',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakingToken: {
    constant: true,
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardsToken: {
    constant: true,
    inputs: [],
    name: 'rewardsToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pricePerShare: {
    stateMutability: 'view',
    type: 'function',
    name: 'pricePerShare',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

type PoolBalances = Balance & {
  pricePerFullShare: number
}

export async function getYearnFarmCurveContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.asset,
  })

  const [tokens, rewards] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(assets, (res) => ({ target: res.output }) as const),
      abi: abi.token,
    }),

    multicall({
      ctx,
      calls: addresses.map((address) => ({ target: address }) as const),
      abi: abi.REWARD_TOKEN,
    }),
  ])

  return mapMultiSuccessFilter(
    tokens.map((_, i) => [tokens[i], rewards[i]]),
    (res, index) => {
      const address = addresses[index]
      const [tokenRes, { output: reward }] = res.inputOutputPairs
      const { input, output } = tokenRes

      return { chain: ctx.chain, address: address, asset: input.target, token: output, rewards: [reward] }
    },
  )
}

export async function getYearnFarmCurveBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [userBalanceRes, earnedRes, pricePerFullSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.asset }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  const poolBalances: PoolBalances[] = mapMultiSuccessFilter(
    userBalanceRes.map((_, i) => [userBalanceRes[i], earnedRes[i]]),

    (res, index) => {
      const pool = contracts[index]
      const reward = pool.rewards![0] as Contract
      const exchangeRate = pricePerFullSharesRes[index].success ? pricePerFullSharesRes[index].output : 1n
      const pricePerFullShare = parseFloatBI(exchangeRate!, pool.decimals!)
      const [{ output: userBalance }, { output: rewardBalance }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance,
        underlyings: undefined,
        pricePerFullShare,
        rewards: [{ ...reward, amount: rewardBalance }],
        category: 'farm' as Category,
      }
    },
  )

  return AdjustUnderlyingsAmount(await getCurveUnderlyingsBalances(ctx, poolBalances))
}

function calculateAdjustedAmount(originalAmount: bigint, pricePerFullShare: number, scaleFactor: number) {
  if (typeof originalAmount !== 'undefined') {
    return BigInt(Number(originalAmount) * pricePerFullShare * scaleFactor) / parseEther('1.0')
  }
  return originalAmount
}

export function AdjustUnderlyingsAmount(pools: PoolBalances[]): PoolBalances[] {
  const scaleFactor = 10 ** 18

  return pools.map((pool) => {
    if (!pool.underlyings || pool.underlyings.length === 0) {
      return pool
    }

    const adjustedUnderlyings = pool.underlyings.map((underlying: Contract) => {
      const amountToAdjust = underlying.amount || pool.amount
      return {
        ...underlying,
        amount: calculateAdjustedAmount(amountToAdjust, pool.pricePerFullShare, scaleFactor),
      }
    })

    return {
      ...pool,
      underlyings: adjustedUnderlyings,
    }
  })
}

export async function getYearnFarmClassicContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const [assets, rewards] = await Promise.all([
    multicall({
      ctx,
      calls: addresses.map((address) => ({ target: address }) as const),
      abi: abi.stakingToken,
    }),
    multicall({
      ctx,
      calls: addresses.map((address) => ({ target: address }) as const),
      abi: abi.rewardsToken,
    }),
  ])

  return mapMultiSuccessFilter(
    assets.map((_, i) => [assets[i], rewards[i]]),
    (res, index) => {
      const address = addresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs

      return { chain: ctx.chain, address: address, token, rewards: [reward] }
    },
  )
}

export async function getYearnFarmClassicBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [userBalanceRes, earnedRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalanceRes.map((_, i) => [userBalanceRes[i], earnedRes[i]]),

    (res, index) => {
      const pool = contracts[index]
      const reward = pool.rewards![0] as Contract
      const [{ output: userBalance }, { output: rewardBalance }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance,
        underlyings: undefined,
        rewards: [{ ...reward, amount: rewardBalance }],
        category: 'farm' as Category,
      }
    },
  )
}
