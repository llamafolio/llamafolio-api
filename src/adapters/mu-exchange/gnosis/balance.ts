import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const wxDAI: Contract = {
  chain: 'gnosis',
  address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  decimals: 18,
  symbol: 'wxDAI',
}

export async function getsDaiBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [msDaiBalance, msDaiTotalSupply, sDaiTokenBalance, sDaiTotalSupply, wxTokenBalance] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: staker.token!, params: [staker.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.token!, abi: erc20Abi.totalSupply }),
    call({ ctx, target: wxDAI.address, params: [staker.token!], abi: erc20Abi.balanceOf }),
  ])

  const sDAIAmount = (msDaiBalance * sDaiTokenBalance) / msDaiTotalSupply
  const wxDAIAmount = (sDAIAmount * wxTokenBalance) / sDaiTotalSupply

  return {
    ...staker,
    amount: sDAIAmount,
    underlyings: [{ ...wxDAI, amount: wxDAIAmount }],
    rewards: undefined,
    category: 'stake',
  }
}
