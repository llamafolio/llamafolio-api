import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  lockedBalances: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'available', type: 'uint256' },
      { internalType: 'uint256', name: 'lockedTotal', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
        ],
        internalType: 'struct RevenueShareBase.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct RevenueShareBase.RewardData[]',
        name: '_rewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getITPFarmBalance(ctx: BalancesContext, pool: Contract): Promise<Balance[]> {
  const [userBalance, userPendingRewards] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: pool.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const rewards = pool.rewards as Balance[]
  rewards.forEach((reward, index) => {
    reward.amount = userPendingRewards[index].amount
  })

  const pairBalance: Balance = {
    ...(pool as Balance),
    amount: userBalance[0],
    rewards,
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [pairBalance], { getAddress: (contract) => contract.token! })
}
