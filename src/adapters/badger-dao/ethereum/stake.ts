import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { parseEther } from 'viem'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBadgerStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balance, exchangeRate] = await Promise.all([
    getSingleStakeBalance(ctx, staker),
    call({ ctx, target: staker.address, abi: abi.pricePerShare }),
  ])

  return {
    ...balance,
    amount: (balance.amount * exchangeRate) / parseEther('1.0'),
  }
}
