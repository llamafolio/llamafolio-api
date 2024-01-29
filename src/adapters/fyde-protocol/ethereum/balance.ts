import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

export async function getFydeFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const balance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  return { ...farmer, amount: balance, underlyings: undefined, rewards: undefined, category: 'farm' }
}
