import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
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

export async function getStakedFraxBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const { output: BalanceOfRes } = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const { output: fmtBalances } = await call({
    ctx,
    target: staker.address,
    params: [BalanceOfRes],
    abi: abi.convertToAssets,
  })

  return {
    ...staker,
    amount: BigNumber.from(fmtBalances),
    underlyings: staker.underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }
}
