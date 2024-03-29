import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  calculateSharesValueInX2Y2: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'calculateSharesValueInX2Y2',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const x2y2: Token = {
  chain: 'ethereum',
  address: '0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9',
  decimals: 18,
  symbol: 'X2Y2',
}

export async function getX2Y2YieldBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const balanceOf = await call({
    ctx,
    target: farmer.address,
    params: [ctx.address],
    abi: abi.calculateSharesValueInX2Y2,
  })

  return {
    ...farmer,
    amount: balanceOf,
    underlyings: [x2y2],
    rewards: undefined,
    category: 'farm',
  }
}
