import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
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
  pendingCore: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingCore',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CORE: Token = {
  chain: 'ethereum',
  address: '0x62359ed7505efc61ff1d56fef82158ccaffa23d7',
  decimals: 18,
  symbol: 'CORE',
}

export async function getCVaultFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const lpBalances: Balance[] = []

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterchef.address, params: [pool.pid, ctx.address] }) as const),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterchef.address, params: [pool.pid, ctx.address] }) as const),
      abi: abi.pendingCore,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const pendingRewardRes = pendingRewardsRes[index]

    if (!userBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const balance: Balance = {
      ...pool,
      amount: userBalanceRes.output[0],
      underlyings: pool.underlyings as Contract[],
      rewards: [{ ...CORE, amount: pendingRewardRes.output }],
      category: 'farm',
    }

    if (!balance.underlyings) {
      balances.push(balance)
    } else {
      lpBalances.push(balance)
    }
  }

  return [...balances, ...(await getUnderlyingBalances(ctx, lpBalances))]
}
