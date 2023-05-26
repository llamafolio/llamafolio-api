import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDR: Token = {
  chain: 'polygon',
  address: '0xb5dfabd7ff7f83bab83995e72a52b97abb7bcf63',
  decimals: 9,
  symbol: 'USDR',
}

export async function getTangibleStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const fmtBalance = await call({
    ctx,
    target: staker.address,
    params: [userBalance],
    abi: abi.convertToAssets,
  })

  const balance: Balance = {
    ...staker,
    amount: BigNumber.from(fmtBalance),
    underlyings: [USDR],
    rewards: undefined,
    category: 'stake',
  }

  return balance
}
