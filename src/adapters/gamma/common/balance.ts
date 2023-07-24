import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { getMasterChefLpToken } from '@lib/masterchef/masterchef'
import { multicall } from '@lib/multicall'
import type { Pair } from '@lib/uniswap/v2/factory'

const abi = {
  getTotalAmounts: {
    inputs: [],
    name: 'getTotalAmounts',
    outputs: [
      { internalType: 'uint256', name: 'total0', type: 'uint256' },
      { internalType: 'uint256', name: 'total1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingSushi: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
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
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGammaFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[poolIdx]

    if (!underlyings || !balancesOfRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: balancesOfRes.output,
      underlyings,
      rewards: undefined,
      category: 'farm',
    })
  }

  return getGammaUnderlyings(ctx, balances)
}

const getGammaUnderlyings = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const [totalAmountsRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: abi.getTotalAmounts,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const totalAmountRes = totalAmountsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !totalAmountRes.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    const tokens = underlyings.map((underlying, index) => {
      const amount = (pool.amount * totalAmountRes.output[index]) / totalSupplyRes.output
      return {
        ...underlying,
        amount,
      }
    })

    balances.push({
      ...pool,
      amount: pool.amount,
      underlyings: tokens,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}

export async function getGammaMasterchefBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchefs: Contract[],
): Promise<Balance[]> {
  const balances: Balance[] = []
  const masterchefPools: Contract[] = []

  for (const masterchef of masterchefs) {
    masterchefPools.push(
      ...(await getMasterChefLpToken(ctx, pairs, masterchef)).map((res) => ({ ...res, provider: masterchef.address })),
    )
  }

  const poolsBalancesRes = await multicall({
    ctx,
    calls: masterchefPools.map((pool) => ({ target: pool.provider, params: [BigInt(pool.pid), ctx.address] }) as const),
    abi: abi.userInfo,
  })

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const masterchefPool = masterchefPools[userIdx]
    const poolBalanceRes = poolsBalancesRes[userIdx]

    if (!poolBalanceRes.success) {
      continue
    }

    balances.push({
      ...masterchefPool,
      underlyings: masterchefPool.underlyings as Contract[],
      category: 'farm',
      amount: poolBalanceRes.output[0],
      rewards: undefined,
    })
  }

  return getGammaUnderlyings(ctx, balances)
}
