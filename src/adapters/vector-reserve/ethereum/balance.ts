import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getVectorReserveBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [shareBalance, totalSupply, tokenBalance] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: staker.token!, params: [staker.address], abi: erc20Abi.balanceOf }),
  ])

  const underlyings = [{ ...WETH, amount: (shareBalance * tokenBalance) / totalSupply }]

  return {
    ...staker,
    amount: shareBalance,
    underlyings,
    rewards: undefined,
    category: 'stake',
  }
}
