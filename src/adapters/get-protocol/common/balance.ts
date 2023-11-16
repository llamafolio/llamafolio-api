import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  balanceOfAssets: {
    inputs: [{ internalType: 'address', name: 'account_', type: 'address' }],
    name: 'balanceOfAssets',
    outputs: [{ internalType: 'uint256', name: 'balanceOfAssets_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGetProtocolBalance(ctx: BalancesContext, xGET: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: xGET.address, params: [ctx.address], abi: abi.balanceOfAssets })

  return {
    ...xGET,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
