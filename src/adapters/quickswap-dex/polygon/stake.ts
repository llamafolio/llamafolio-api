import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  QUICKBalance: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'QUICKBalance',
    outputs: [{ internalType: 'uint256', name: 'quickAmount_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getQuickswapBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: abi.QUICKBalance,
  })

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const underlyings = staker.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[stakerIdx]

    if (!balancesOfRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: balancesOfRes.output,
      underlyings,
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
