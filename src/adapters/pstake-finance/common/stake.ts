import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [
      { internalType: 'uint256', name: 'totalWei', type: 'uint256' },
      { internalType: 'uint256', name: 'poolTokenSupply', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getpStakeBSCBalance(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const underlying = staker.underlyings?.[0] as Contract
  if (!underlying) {
    return
  }

  const [userBalance, [totalWei, poolTokenSupply]] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.vault, abi: abi.exchangeRate }),
  ])

  const fmtUnderlyings = [{ ...underlying, amount: (totalWei * userBalance) / poolTokenSupply }]

  return {
    ...staker,
    amount: userBalance,
    underlyings: fmtUnderlyings,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getpStakeETHBalance(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const underlying = staker.underlyings?.[0] as Contract
  if (!underlying) {
    return
  }

  const [userBalance, exchangeRate] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.pricePerShare }),
  ])

  const fmtUnderlyings = [{ ...underlying, amount: (exchangeRate * userBalance) / BigInt(Math.pow(10, 18)) }]

  return {
    ...staker,
    amount: userBalance,
    underlyings: fmtUnderlyings,
    rewards: undefined,
    category: 'stake',
  }
}
