import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20ABi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

export async function getLybraFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance | undefined> {
  const userBalance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20ABi.balanceOf })

  const balance: Balance = {
    ...farmer,
    amount: userBalance,
    underlyings: farmer.underlyings as Contract[],
    rewards: undefined,
    category: 'farm',
  }

  return getLybraUnderlyings(ctx, balance)
}

async function getLybraUnderlyings(ctx: BalancesContext, balance: Balance): Promise<Balance | undefined> {
  const underlyings = balance.underlyings as Contract[]

  if (!underlyings) {
    return
  }

  const [underlyingsBalances, totalSupply] = await Promise.all([
    multicall({
      ctx,
      // @ts-expect-error
      calls: range(0, underlyings.length).map((idx) => ({ target: balance.token!, params: [idx] }) as const),
      abi: abi.balances,
    }),
    call({ ctx, target: balance.token!, abi: erc20ABi.totalSupply }),
  ])

  const fmtUnderlyings = mapSuccessFilter(underlyingsBalances, (res, idx) => ({
    ...underlyings[idx],
    amount: (res.output * balance.amount) / totalSupply,
  }))

  return {
    ...balance,
    underlyings: fmtUnderlyings,
  }
}
