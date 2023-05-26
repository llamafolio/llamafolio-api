import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const Ice: Token = {
  chain: 'ethereum',
  address: '0xf16e81dce15B08F326220742020379B855B87DF9',
  decimals: 18,
  symbol: 'ICE',
}

export async function getPopsicleStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalanceOf, tokenBalancesOfRes, tokenSupplyRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: Ice.address, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(userBalanceOf).mul(tokenBalancesOfRes).div(tokenSupplyRes),
    underlyings: [Ice],
    rewards: undefined,
    category: 'stake',
  }
}
