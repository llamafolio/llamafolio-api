import { getFourBeltUnderlyingsBalances } from '@adapters/belt-finance/bsc/lp'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { parseEther } from 'viem'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingBELT: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingBELT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakedWantTokens: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'stakedWantTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BELT: Token = {
  chain: 'bsc',
  address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
  decimals: 18,
  symbol: 'BELT',
}

export async function getFarmBeltBalances(ctx: BalancesContext, pools: Contract[], masterChef: Contract) {
  const balances: Balance[] = []

  const splitPidPools = pools.flatMap((pool) => pool.pid.map((pid: number) => ({ ...pool, pid })))

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: splitPidPools.map((pool) => ({ target: masterChef.address, params: [pool.pid, ctx.address] }) as const),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: splitPidPools.map((pool) => ({ target: masterChef.address, params: [pool.pid, ctx.address] }) as const),
      abi: abi.pendingBELT,
    }),
  ])

  for (let poolIdx = 0; poolIdx < splitPidPools.length; poolIdx++) {
    const pool = splitPidPools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]

    if (!userBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const [shares, _rewardDebt] = userBalanceRes.output

    balances.push({
      ...pool,
      amount: shares,
      underlyings,
      rewards: [{ ...BELT, amount: pendingRewardRes.output }],
      category: 'farm',
    })
  }

  return getBeltUnderlyingsBalances(ctx, balances)
}

const getBeltUnderlyingsBalances = async (ctx: BalancesContext, poolBalances: Balance[]) => {
  const singleUnderlyingsPools: Balance[] = []
  const swapPools: Balance[] = []
  const fourBeltPools: Balance[] = []

  for (const poolBalance of poolBalances) {
    const underlyings = poolBalance.underlyings
    if (!underlyings) {
      continue
    }

    switch (underlyings.length) {
      case 1:
        singleUnderlyingsPools.push(poolBalance)
        break
      case 2:
        swapPools.push(poolBalance)
        break
      case 4:
        fourBeltPools.push(poolBalance)
        break
      default:
        break
    }
  }

  const [singleUnderlyingsPoolsBalances, swapPoolsBalances, fourBeltPoolsBalances] = await Promise.all([
    getSingleUnderlyingsPoolsBalances(ctx, singleUnderlyingsPools),
    getUnderlyingBalances(ctx, swapPools),
    getFourBeltUnderlyingsBalances(ctx, fourBeltPools),
  ])

  return [...singleUnderlyingsPoolsBalances, ...swapPoolsBalances, ...fourBeltPoolsBalances]
}

const getSingleUnderlyingsPoolsBalances = async (ctx: BalancesContext, poolBalances: Balance[]) => {
  const exchangeRatesRes = await multicall({
    ctx,
    calls: poolBalances.map((pool) => ({ target: pool.address })),
    abi: abi.getPricePerFullShare,
  })

  poolBalances.forEach((poolBalance, idx) => {
    const exchangeRateRes = exchangeRatesRes[idx]
    if (!exchangeRateRes.success) {
      return
    }

    ;(poolBalance.underlyings?.[0] as Balance).amount =
      (poolBalance.amount * exchangeRateRes.output) / parseEther('1.0')
  })

  return poolBalances
}
