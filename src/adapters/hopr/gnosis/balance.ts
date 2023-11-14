import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  accounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'accounts',
    outputs: [
      { internalType: 'uint256', name: 'actualLockedTokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'lastSyncTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'cumulatedRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'claimedRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const HOPR: Contract = {
  chain: 'gnosis',
  address: '0xd057604a14982fe8d88c5fc25aac3267ea142a08',
  decimals: 18,
  symbol: 'HOPR',
}

export async function getHoprBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const accountsInfosRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: abi.accounts,
  })

  return mapSuccessFilter(accountsInfosRes, (res, index) => {
    const staker = stakers[index]
    const [actualLockedTokenAmount, _, cumulatedRewards] = res.output

    if (actualLockedTokenAmount === 0n) return null

    return {
      ...staker,
      amount: actualLockedTokenAmount,
      underlyings: undefined,
      rewards: [{ ...HOPR, amount: cumulatedRewards }],
      category: 'stake' as Category,
    }
  }).filter(isNotNullish)
}
