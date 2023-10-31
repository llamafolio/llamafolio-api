import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const xSushi: Token = {
  chain: 'ethereum',
  address: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
  decimals: 18,
  symbol: 'xSUSHI',
}

export async function getXSushiStakeBalance(ctx: BalancesContext, xSushi: Contract): Promise<Balance> {
  const balanceOf = await call({ ctx, target: xSushi.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balance: Balance = {
    ...xSushi,
    amount: balanceOf,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }

  return balance
}

export async function getMeowshiYieldBalance(ctx: BalancesContext, meowshi: Contract): Promise<Balance> {
  const meowConverter = BigInt(1e5) // 1 xSushi -> 100k meowshi

  const balanceOf = await call({ ctx, target: meowshi.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balance: Balance = {
    ...meowshi,
    amount: balanceOf,
    underlyings: [{ ...xSushi, amount: balanceOf / meowConverter }],
    rewards: undefined,
    category: 'farm',
  }

  return balance
}
