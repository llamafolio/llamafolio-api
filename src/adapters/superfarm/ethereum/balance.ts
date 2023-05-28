import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  getPendingTokens: {
    inputs: [
      { internalType: 'contract IERC20', name: '_token', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getPendingTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'contract IERC20', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenPaid', type: 'uint256' },
      { internalType: 'uint256', name: 'pointPaid', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSuperFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const calls: Call<typeof abi.userInfo>[] = pools.map((pool) => ({
    target: pool.staker,
    params: [pool.address, ctx.address],
  }))

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.getPendingTokens }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = (pool.underlyings as Contract[]) || [pool]
    const reward = pool.rewards?.[0] as Contract
    const userBalanceRes = userBalancesRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]

    if (!underlyings || !reward || !userBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const [amount] = userBalanceRes.output

    balances.push({
      ...pool,
      amount: amount,
      underlyings,
      rewards: [{ ...reward, amount: pendingRewardRes.output }],
      category: 'farm',
    })
  }

  const fmtBalances = await getUnderlyingBalances(ctx, balances)

  for (let i = 0; i < fmtBalances.length; i++) {
    const contractIndex = balances.findIndex((contract) => contract.address === fmtBalances[i].address)
    if (contractIndex !== -1) {
      balances[contractIndex] = Object.assign({}, balances[contractIndex], fmtBalances[i])
    }
  }

  return balances
}
