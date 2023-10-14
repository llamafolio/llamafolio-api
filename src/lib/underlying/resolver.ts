import type { Balance, BalancesContext } from '@lib/adapter'
import { getUnderlyingsBalancesFromBalancer } from '@lib/underlying/provider/balancer'

interface BasicResolverArgs {
  ctx: BalancesContext
  balances: Balance[]
}

const getUnderlyingsBalances: { [key: string]: (args: any) => Promise<Balance[]> } = {
  balancer: ({ ctx, balances, vault, params }: any) => getUnderlyingsBalancesFromBalancer(ctx, balances, vault, params),
}

export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(
  provider: string,
  resolverArgs: T,
): Promise<Balance[]> {
  return getUnderlyingsBalances[provider](resolverArgs)
}
