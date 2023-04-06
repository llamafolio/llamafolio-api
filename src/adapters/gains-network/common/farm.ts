import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
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

export async function getGainsBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const underlying = farmer.underlyings?.[0] as Contract
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
    underlyings: [underlying],
    rewards: undefined,
    category: 'farm',
  }
}
