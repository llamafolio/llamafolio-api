import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { get_xLP_UnderlyingsBalances } from '@lib/gmx/underlying'

const abi = {
  totalAssets: {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalAssetsDeposits: {
    inputs: [],
    name: 'totalAssetsDeposits',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDC: Contract = {
  chain: 'arbitrum',
  address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  decimals: 6,
  symbol: 'USDC',
}

export async function getjUSDCYieldBalance(ctx: BalancesContext, JUSDC: Contract): Promise<Balance> {
  const [shareBalance, tokenBalance, supply] = await Promise.all([
    call({ ctx, target: JUSDC.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: JUSDC.address, abi: abi.totalAssets }),
    call({ ctx, target: JUSDC.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...JUSDC,
    amount: shareBalance,
    underlyings: [{ ...USDC, decimals: 18, amount: (shareBalance * tokenBalance) / supply }],
    rewards: undefined,
    category: 'farm',
  }
}

export async function getjGLPYieldBalances(ctx: BalancesContext, JGLP: Contract, vault: Contract): Promise<Balance[]> {
  const [shareBalance, tokenBalance, supply] = await Promise.all([
    call({ ctx, target: JGLP.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: JGLP.address, abi: abi.totalAssets }),
    call({ ctx, target: JGLP.address, abi: erc20Abi.totalSupply }),
  ])

  const jGLPBalance: Balance = {
    ...JGLP,
    amount: (shareBalance * tokenBalance) / supply,
    underlyings: JGLP.underlyings as Contract[],
    rewards: undefined,
    category: 'farm',
  }

  return get_xLP_UnderlyingsBalances(ctx, [jGLPBalance], vault, { getAddress: (contract) => contract.token! })
}
