import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  convertSnBnbToBnb: {
    inputs: [{ internalType: 'uint256', name: '_amountInSnBnb', type: 'uint256' }],
    name: 'convertSnBnbToBnb',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSBNBBalance(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balance = await call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtBalance = await call({ ctx, target: contract.converter, params: [balance], abi: abi.convertSnBnbToBnb })

  return {
    ...contract,
    amount: balance,
    underlyings: [{ ...(contract.underlyings?.[0] as Contract), amount: fmtBalance }],
    rewards: undefined,
    category: 'stake',
  }
}
