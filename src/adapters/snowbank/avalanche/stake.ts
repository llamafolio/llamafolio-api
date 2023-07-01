import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'

const abi = {
  wsSBtosSB: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wsSBTosSB',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getwsSBStakeBalances(ctx: BalancesContext, staker: Contract) {
  const balance = await getSingleStakeBalance(ctx, staker)

  const fmtBalances = await call({
    ctx,
    target: staker.address,
    params: [balance.amount],
    abi: abi.wsSBtosSB,
  })

  const res = {
    ...staker,
    amount: fmtBalances,
    decimals: 9,
    rewards: undefined,
    category: 'stake',
  } as Balance

  return res
}
