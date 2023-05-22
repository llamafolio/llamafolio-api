import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const PILLS: Token = {
  chain: 'fantom',
  address: '0xB66b5D38E183De42F21e92aBcAF3c712dd5d6286',
  decimals: 18,
  symbol: 'PILLS',
}

const WFTM: Token = {
  chain: 'fantom',
  address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  decimals: 18,
  symbol: 'WFTM',
}

export async function getMorpheusStakersBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const userBalanceRes = userBalancesRes[stakeIdx]
    const pendingRewardRes = pendingRewardsRes[stakeIdx]

    if (!isSuccess(userBalanceRes) || !isSuccess(pendingRewardRes)) {
      continue
    }

    balances.push({
      ...staker,
      decimals: 18,
      amount: BigNumber.from(userBalanceRes.output.amount),
      underlyings: [PILLS],
      rewards: [{ ...WFTM, amount: BigNumber.from(pendingRewardRes.output) }],
      category: 'stake',
    })
  }

  return balances
}
