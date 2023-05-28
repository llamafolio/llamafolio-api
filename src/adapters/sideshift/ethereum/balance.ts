import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const XAI: Token = {
  chain: 'ethereum',
  address: '0x35e78b3982E87ecfD5b3f3265B601c046cDBe232',
  symbol: 'XAI',
  decimals: 18,
}

export async function getsvXAIBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const fmtBalanceOf = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abi.convertToAssets,
  })

  return {
    ...contract,
    amount: fmtBalanceOf,
    underlyings: [XAI],
    rewards: undefined,
    category: 'farm',
  }
}
