import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  getStETHByWstETH: {
    inputs: [{ internalType: 'uint256', name: '_wstETHAmount', type: 'uint256' }],
    name: 'getStETHByWstETH',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertStMaticToMatic: {
    inputs: [{ internalType: 'uint256', name: '_balance', type: 'uint256' }],
    name: 'convertStMaticToMatic',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getWStEthStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const formattedBalanceOf = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abi.getStETHByWstETH,
  })

  balances.push({
    chain: ctx.chain,
    decimals: contract.decimals,
    symbol: contract.symbol,
    address: contract.address,
    amount: formattedBalanceOf,
    category: 'stake',
  })
  return balances
}

export async function getStEthStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  balances.push({
    chain: ctx.chain,
    decimals: contract.decimals,
    symbol: contract.symbol,
    address: contract.address,
    amount: balanceOf,
    category: 'stake',
  })

  return balances
}

export async function getStMaticBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const [formattedBalanceOf] = await call({
    ctx,
    target: contract.address,
    params: [balanceOfRes],
    abi: abi.convertStMaticToMatic,
  })

  balances.push({
    chain: ctx.chain,
    decimals: contract.decimals,
    symbol: contract.symbol,
    address: contract.address,
    amount: formattedBalanceOf,
    category: 'stake',
  })

  return balances
}
