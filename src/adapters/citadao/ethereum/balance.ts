import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const KNIGHT: Contract = {
  chain: 'ethereum',
  address: '0x3541A5C1b04AdABA0B83F161747815cd7B1516bC',
  decimals: 18,
  symbol: 'KNIGHT',
}

export async function getCitaDaoStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShare, tokenBalance, totalSupply] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: KNIGHT.address, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...KNIGHT, amount: (userShare * tokenBalance) / totalSupply }],
    rewards: undefined,
    category: 'stake',
  }
}
