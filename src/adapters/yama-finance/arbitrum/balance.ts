import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseEther } from 'viem'

const abi = {
  value: {
    inputs: [],
    name: 'value',
    outputs: [{ internalType: 'uint256', name: 'value_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getYamaStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const underlying = staker.underlyings?.[0] as Contract

  const [balanceOf, value] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.value }),
  ])

  return {
    ...staker,
    amount: balanceOf,
    underlyings: [{ ...underlying, amount: (balanceOf * value) / parseEther('1.0'), decimals: 18 }],
    rewards: undefined,
    category: 'stake',
  }
}
