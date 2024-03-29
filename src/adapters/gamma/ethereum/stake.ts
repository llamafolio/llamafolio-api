import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const gamma: Token = {
  chain: 'ethereum',
  address: '0x6BeA7CFEF803D1e3d5f7C0103f7ded065644e197',
  decimals: 18,
  symbol: 'GAMMA',
}

export async function getxGammaBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, assetBalance, totalSupply] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: gamma.address, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...staker,
    amount: (userBalance * assetBalance) / totalSupply,
    underlyings: [gamma],
    rewards: undefined,
    category: 'stake',
  }
}
