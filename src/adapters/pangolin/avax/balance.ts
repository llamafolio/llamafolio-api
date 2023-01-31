import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const pangolin: Token = {
  chain: 'avax',
  address: '0x60781c2586d68229fde47564546784ab3faca982',
  decimals: 18,
  symbol: 'PNG',
}

export async function getPangolinStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalanceOfRes, userEarnedRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.earned }),
  ])

  balances.push({
    ...staker,
    decimals: pangolin.decimals,
    symbol: pangolin.symbol,
    amount: BigNumber.from(userBalanceOfRes.output),
    underlyings: [pangolin],
    rewards: [{ ...pangolin, amount: BigNumber.from(userEarnedRes.output) }],
    category: 'stake',
  })

  return balances
}
