import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'UFixed18', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'UFixed18', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

export async function getPVAFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const { output: balanceOfRes } = await call({
    ctx,
    target: farmer.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const { output: fmtBalances } = await call({
    ctx,
    target: farmer.address,
    params: [balanceOfRes],
    abi: abi.convertToAssets,
  })

  return {
    ...farmer,
    amount: BigNumber.from(fmtBalances),
    underlyings: [USDC],
    rewards: undefined,
    category: 'farm',
  }
}
