import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const XAI: Token = {
  chain: 'ethereum',
  address: '0x35e78b3982E87ecfD5b3f3265B601c046cDBe232',
  symbol: 'XAI',
  decimals: 18,
}

export async function getsvXAIBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const { output: balanceOf } = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const { output: fmtBalanceOf } = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abi.convertToAssets,
  })

  return {
    ...contract,
    amount: BigNumber.from(fmtBalanceOf),
    underlyings: [XAI],
    rewards: undefined,
    category: 'farm',
  }
}