import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const xSushi: Token = {
  chain: 'ethereum',
  address: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
  decimals: 18,
  symbol: 'xSUSHI',
}

export async function getStakeBalances(ctx: BalancesContext, xSushi: Contract): Promise<Balance> {
  const balanceOf = await call({ ctx, target: xSushi.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balance: Balance = {
    ...xSushi,
    amount: BigNumber.from(balanceOf.output),
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }

  return balance
}

export async function getYieldBalances(ctx: BalancesContext, meowshi: Contract): Promise<Balance> {
  const meowConverter = 1e5 // 1 xSushi -> 100k meowshi

  const balanceOf = await call({ ctx, target: meowshi.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balance: Balance = {
    ...meowshi,
    amount: BigNumber.from(balanceOf.output),
    underlyings: [{ ...xSushi, amount: BigNumber.from(balanceOf.output).div(meowConverter) }],
    rewards: undefined,
    category: 'farm',
  }

  return balance
}
