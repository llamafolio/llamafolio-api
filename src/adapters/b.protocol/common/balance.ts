import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  deposits: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'getCompoundedLUSDDeposit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositorLQTYGain: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'getDepositorLQTYGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBprotocolFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const [userShare, tokenBalance, totalSupply] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: farmer.stabilityPool, params: [farmer.address], abi: abi.deposits }),
    call({ ctx, target: farmer.address, abi: erc20Abi.totalSupply }),
  ])

  const userBalance = (userShare * tokenBalance) / totalSupply

  return {
    ...farmer,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}
