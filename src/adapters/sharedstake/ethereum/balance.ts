import type { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
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

const SGT: Contract = {
  chain: 'ethereum',
  address: '0x24C19F7101c1731b85F1127EaA0407732E36EcDD',
  decimals: 18,
  symbol: 'SGT',
  pid: 0,
}

interface getShareStakeBalancesParams extends FarmBalance {
  provider?: string
}

export async function getShareStakeBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const sushiBalances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = []
  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    calls.push({ target: masterchef.address, params: [contracts[poolIdx].pid, ctx.address] })
  }

  const [poolsBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const contract = contracts[userIdx]
    const underlyings = contract.underlyings as Contract[]
    const poolBalanceRes = poolsBalancesRes[userIdx]
    const pendingRewardRes = pendingRewardsRes[userIdx]

    if (!poolBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const [amount] = poolBalanceRes.output

    const balance: getShareStakeBalancesParams = {
      ...contract,
      underlyings: undefined,
      category: 'farm',
      amount: amount,
      rewards: [{ ...SGT, amount: pendingRewardRes.output }],
    }

    if (balance.provider === 'sushi') {
      balance.underlyings = underlyings
      sushiBalances.push(balance)
      continue
    }

    balances.push(balance)
  }

  const updateBalancesWithUnderlyingsAmount = await getUnderlyingBalances(ctx, sushiBalances)

  return [...balances, ...updateBalancesWithUnderlyingsAmount]
}
