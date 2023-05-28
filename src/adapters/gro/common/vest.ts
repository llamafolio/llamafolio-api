import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  totalBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'totalBalance',
    outputs: [{ internalType: 'uint256', name: 'unvested', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vestedBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'vestedBalance',
    outputs: [{ internalType: 'uint256', name: 'unvested', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGroVestingBalances(ctx: BalancesContext, vester: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const token = vester.underlyings?.[0] as Contract

  const [balancesOf, claimableBalances] = await Promise.all([
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.totalBalance }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.vestedBalance }),
  ])

  balances.push({
    ...token,
    address: vester.address,
    amount: balancesOf,
    claimable: claimableBalances,
    underlyings: [token],
    rewards: undefined,
    category: 'vest',
  })

  return balances
}
