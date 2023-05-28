import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const LON: Token = {
  chain: 'ethereum',
  address: '0x0000000000095413afC295d19EDeb1Ad7B71c952',
  decimals: 18,
  symbol: 'LON',
}

export async function getxLONstakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalanceOfRes, tokenBalanceOfRes, totalSupplyRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: LON.address, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...staker,
    amount: (userBalanceOfRes * tokenBalanceOfRes) / totalSupplyRes,
    underlyings: [LON],
    rewards: undefined,
    category: 'stake',
  }
}
