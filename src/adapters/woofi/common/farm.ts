import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingXWoo: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingXWoo',
    outputs: [
      { internalType: 'uint256', name: 'pendingXWooAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'pendingWooAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  costSharePrice: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'costSharePrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WOO: { [key: string]: Contract } = {
  arbitrum: {
    chain: 'arbitrum',
    address: '0xcafcd85d8ca7ad1e1c6f82f651fa15e33aefd07b',
    decimals: 18,
    symbol: 'WOO',
  },
  avalanche: {
    chain: 'avalanche',
    address: '0xabc9547b534519ff73921b1fba6e672b5f58d083',
    decimals: 18,
    symbol: 'WOO',
  },
  bsc: {
    chain: 'bsc',
    address: '0x4691937a7508860f876c9c0a2a617e7d9e945d4b',
    decimals: 18,
    symbol: 'WOO',
  },
  fantom: {
    chain: 'fantom',
    address: '0x6626c47c00f1d87902fc13eecfac3ed06d5e8d8a',
    decimals: 18,
    symbol: 'WOO',
  },
  optimism: {
    chain: 'optimism',
    address: '0x871f2f2ff935fd1ed867842ff2a7bfd051a5e527',
    decimals: 18,
    symbol: 'WOO',
  },
  polygon: {
    chain: 'polygon',
    address: '0x1b815d120b3ef02039ee11dc2d33de7aa4a8c603',
    decimals: 18,
    symbol: 'WOO',
  },
}

export async function getWoofiBalances(ctx: BalancesContext, pools: Contract[]) {
  return Promise.all([getWoofiYieldBalances(ctx, pools), getWoofiFarmBalances(ctx, pools)])
}

export async function getWoofiYieldBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address } as const)), abi: abi.getPricePerFullShare }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[poolIdx]
    const exchangeRateRes = exchangeRatesRes[poolIdx]

    if (!userBalanceRes.success || !exchangeRateRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0'),
      underlyings,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}

export async function getWoofiFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const fmtPools = pools.filter((pool) => pool.masterchef !== undefined)

  const [userBalancesRes, pendingRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: fmtPools.map((pool) => ({ target: pool.masterchef, params: [pool.pid, ctx.address] } as const)),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: fmtPools.map((pool) => ({ target: pool.masterchef, params: [pool.pid, ctx.address] } as const)),
      abi: abi.pendingXWoo,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address } as const)), abi: abi.getPricePerFullShare }),
  ])

  return fmtPools
    .map((pool, idx) => {
      const underlying = pool.underlyings?.[0] as Contract
      const userBalance = userBalancesRes[idx]
      const pendingRewardRes = pendingRewardsRes[idx]
      const exchangeRateRes = exchangeRatesRes[idx]

      if (!underlying || !userBalance.success || !pendingRewardRes.success || !exchangeRateRes.success) {
        return null
      }

      return {
        ...pool,
        amount: userBalance.output[0],
        underlyings: [{ ...underlying, amount: (userBalance.output[0] * exchangeRateRes.output) / parseEther('1.0') }],
        rewards: [{ ...WOO[ctx.chain], amount: pendingRewardRes.output[1] }],
        category: 'farm',
      }
    })
    .filter(isNotNullish) as Balance[]
}
