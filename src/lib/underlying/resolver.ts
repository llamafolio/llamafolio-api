import type { Balance, BalancesContext } from '@lib/adapter'
import { getUnderlyingsBalancesFromBalancer } from '@lib/underlying/provider/balancer'
import { getUnderlyingsBalancesFromCurve } from '@lib/underlying/provider/curve'
import { getDefaultSingleUnderlyingsBalances } from '@lib/underlying/provider/default'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

interface BasicResolverArgs {
  ctx: BalancesContext
  balances: Balance[]
}

const getUnderlyingsBalances: { [key: string]: (args: any) => Promise<Balance[]> } = {
  single: ({ ctx, balances, params }: any) => getDefaultSingleUnderlyingsBalances(ctx, balances, params),
  univ2: ({ ctx, balances, params }: any) => getUnderlyingBalances(ctx, balances, params),
  balancer: ({ ctx, balances, vault, params }: any) => getUnderlyingsBalancesFromBalancer(ctx, balances, vault, params),
  curve: ({ ctx, balances, registry }: any) => getUnderlyingsBalancesFromCurve(ctx, balances, registry),
}

export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(
  provider: string,
  resolverArgs: T,
): Promise<Balance[]> {
  return getUnderlyingsBalances[provider](resolverArgs)
}
