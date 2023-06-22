import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBeltStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const [userBalance, exchangeRate] = await Promise.all([
    getSingleStakeBalance(ctx, contract),
    call({ ctx, target: contract.address, abi: abi.getPricePerFullShare }),
  ])

  return { ...userBalance, amount: (userBalance.amount * exchangeRate) / parseEther('1.0') }
}
