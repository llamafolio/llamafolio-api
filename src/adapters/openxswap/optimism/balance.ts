import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const openX: Contract = {
  chain: 'optimism',
  address: '0xc3864f98f2a61A7cAeb95b039D031b4E2f55e0e9',
  decimals: 18,
  symbol: 'openX',
}

export async function getOpenXStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShare, totalAsset, totalSupply] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: openX.address, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...openX, amount: (userShare * totalAsset) / totalSupply }],
    rewards: undefined,
    category: 'stake',
  }
}
