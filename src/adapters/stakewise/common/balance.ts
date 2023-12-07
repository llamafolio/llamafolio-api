import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

export async function getStakewiseBalances(
  ctx: BalancesContext,
  staker: Contract,
  rewarder: Contract,
): Promise<Balance> {
  const [userBalance, userPendingRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: rewarder.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...(staker.rewards![0] as Contract), amount: userPendingRewards }],
    category: 'stake',
  }
}
