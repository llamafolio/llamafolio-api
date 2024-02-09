import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  accounts: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'accounts',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'current', type: 'uint256' },
          { internalType: 'uint256', name: 'latest', type: 'uint256' },
          { internalType: 'UFixed6', name: 'shares', type: 'uint256' },
          { internalType: 'UFixed6', name: 'assets', type: 'uint256' },
          { internalType: 'UFixed6', name: 'deposit', type: 'uint256' },
          { internalType: 'UFixed6', name: 'redemption', type: 'uint256' },
        ],
        internalType: 'struct Account',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPerennialStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: abi.accounts,
  })

  return mapSuccessFilter(balances, (res, index) => ({
    ...stakers[index],
    amount: res.output.deposit,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
