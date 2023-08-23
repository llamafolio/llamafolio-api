import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi, getBalancesOf } from '@lib/erc20'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getOvernightFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, farmers)

  return balances.map((balance) => ({ ...balance, category: 'farm' }))
}

export async function getOvernightStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtBalances = await call({ ctx, target: staker.address, params: [balance], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: balance,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: fmtBalances }],
    rewards: undefined,
    category: 'stake',
  }
}
