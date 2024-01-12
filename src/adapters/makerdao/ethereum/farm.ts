import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  pie: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pie',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  chi: {
    constant: true,
    inputs: [],
    name: 'chi',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pieOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pieOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DECIMALS = {
  wad: parseEther('1.0'), // 10 ** 18,
  ray: parseEther('1000000000'), //  10 ** 27
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

export async function getDaiYieldBalance(
  ctx: BalancesContext,
  farmer: Contract,
  proxies: Contract[],
): Promise<Balance> {
  const [userBalance, exchangeRate] = await Promise.all([
    call({ ctx, target: farmer.address, params: [proxies[0].address], abi: abi.pie }),
    call({ ctx, target: farmer.address, abi: abi.chi }),
  ])

  return {
    ...farmer,
    amount: userBalance,
    underlyings: [{ ...DAI, amount: (userBalance * exchangeRate) / DECIMALS.ray }],
    rewards: undefined,
    category: 'farm',
  }
}

export async function getsDaiYieldBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtBalance = await call({ ctx, target: farmer.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...farmer,
    amount: userBalance,
    underlyings: [{ ...DAI, amount: fmtBalance }],
    rewards: undefined,
    category: 'farm',
  }
}
