import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const POOF: Token = {
  chain: 'ethereum',
  address: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  decimals: 18,
  symbol: 'POOF',
}

export async function getPOOFBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [amountsRes, earnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (const [idx, staker] of stakers.entries()) {
    const amountRes = amountsRes[idx]
    const earnedRes = earnedsRes[idx]

    if (!amountRes.success || !earnedRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: amountRes.output,
      underlyings: undefined,
      rewards: [{ ...POOF, amount: earnedRes.output }],
      category: 'stake',
    })
  }

  return balances
}
