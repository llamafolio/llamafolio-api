import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  debt: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'debt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  deposited: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'deposited',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getCatMarketsBalances(
  ctx: BalancesContext,
  market: Contract,
  tokensLists: Contract[],
): Promise<Balance[]> {
  const [deposited, debt] = await Promise.all([
    call({ ctx, target: market.address, params: [ctx.address], abi: abi.deposited }),
    call({ ctx, target: market.address, params: [ctx.address], abi: abi.debt }),
  ])

  const tokenByCategories = keyBy(tokensLists, 'category')

  const lendBalance: Balance = {
    ...tokenByCategories.lend,
    amount: deposited,
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: Balance = {
    ...tokenByCategories.borrow,
    amount: debt,
    underlyings: [WETH],
    rewards: undefined,
    category: 'borrow',
  }

  return [lendBalance, borrowBalance]
}
