import { getLendingPoolBalances as getAaveLendingPoolBalances } from '@lib/aave/v2/lending'
import type { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  allPendingRewards: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'allPendingRewards',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendingPoolBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  chefIncentivesController: Contract,
  rewardToken: Token,
) {
  const [balances, pendingRewards] = await Promise.all([
    getAaveLendingPoolBalances(ctx, contracts),
    call({ ctx, target: chefIncentivesController.address, params: [ctx.address], abi: abi.allPendingRewards }),
  ])

  balances.push({ ...rewardToken, amount: BigNumber.from(pendingRewards), category: 'reward' })

  return balances
}
