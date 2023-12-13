import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  previewRewards: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'previewRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getProtectorateBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.previewRewards }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...WETH, amount: userReward }],
    category: 'stake',
  }
}

export async function getProtectorateFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const shareBalance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const assetBalance = await call({ ctx, target: farmer.address, params: [shareBalance], abi: abi.convertToAssets })

  return {
    ...farmer,
    amount: shareBalance,
    underlyings: [{ ...WETH, amount: assetBalance }],
    rewards: undefined,
    category: 'farm',
  }
}
