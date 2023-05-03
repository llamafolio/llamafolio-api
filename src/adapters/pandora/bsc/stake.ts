import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'bonus', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const PAN: Token = {
  chain: 'bsc',
  address: '0x72e3d54293e2912fC66Cf4a93625Ac8305E3120D',
  decimals: 18,
  symbol: 'PAN',
}

export async function getStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    calls.push({ target: staker.address, params: [ctx.address] })
  }

  const [userInfosRes, pendingRewards] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const token = staker.underlyings?.[0] as Contract
    const userInfoRes = userInfosRes[idx]
    const pendingReward = pendingRewards[idx]

    if (!isSuccess(userInfoRes) || !isSuccess(pendingReward) || !token) {
      continue
    }

    balances.push({
      ...token,
      amount: BigNumber.from(userInfoRes.output.amount),
      underlyings: undefined,
      rewards: [{ ...PAN, amount: BigNumber.from(pendingReward.output) }],
      category: 'stake',
    })
  }

  return balances
}
