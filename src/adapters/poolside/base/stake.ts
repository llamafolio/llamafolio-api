import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  balanceOfUnderlying: {
    inputs: [{ internalType: 'address', name: 'who', type: 'address' }],
    name: 'balanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const cbETH: Contract = {
  chain: 'base',
  address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  decimals: 18,
  symbol: 'cbETH',
}

export async function getPoolSideStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShareBalance, userAssetBalance] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balanceOfUnderlying }),
  ])

  return {
    ...staker,
    amount: userShareBalance,
    underlyings: [{ ...cbETH, amount: userAssetBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
