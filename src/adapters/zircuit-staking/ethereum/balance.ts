import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  balance: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'balance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getZircuitRestaking(ctx: BalancesContext, contract: Contract): Promise<Balance | []> {
  const allowLists = contract.underlyings as Contract[]
  if (!allowLists) return []

  const balances = await multicall({
    ctx,
    calls: allowLists.map((token) => ({ target: contract.address, params: [token.address, ctx.address] as const })),
    abi: abi.balance,
  })

  return mapSuccessFilter(balances, (res, index) => ({
    ...allowLists[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
