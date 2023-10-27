import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'

const abi = {
  unstakedEscrowedBalanceOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'unstakedEscrowedBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKwentaVotingEscrowedBalance(ctx: BalancesContext, votingEscrow: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: votingEscrow.address,
    params: [ctx.address],
    abi: abi.unstakedEscrowedBalanceOf,
  })

  return {
    ...votingEscrow,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'vest',
  }
}

export async function getKwentaVotingEscrowedV2Balance(ctx: BalancesContext, votingEscrow: Contract): Promise<Balance> {
  return getSingleStakeBalance(ctx, votingEscrow).then((res) => ({ ...res, category: 'vest' }))
}
