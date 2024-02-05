import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseEther } from 'viem'

const abi = {
  exchangeRatio: {
    inputs: [],
    name: 'exchangeRatio',
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

const exchangeAddress: `0x${string}` = '0x4befa2aa9c305238aa3e0b5d17eb20c045269e9d'

export async function getUniEthBalance(ctx: BalancesContext, uniETH: Contract): Promise<Balance> {
  const [shareBalance, pricePerShare] = await Promise.all([
    call({ ctx, target: uniETH.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: exchangeAddress, abi: abi.exchangeRatio }),
  ])

  return {
    ...uniETH,
    amount: shareBalance,
    underlyings: [{ ...WETH, amount: (shareBalance * pricePerShare) / parseEther('1.0') }],
    rewards: undefined,
    category: 'stake',
  }
}
