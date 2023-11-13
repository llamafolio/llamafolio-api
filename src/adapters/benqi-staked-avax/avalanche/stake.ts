import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  getPooledAvaxByShares: {
    inputs: [{ internalType: 'uint256', name: 'shareAmount', type: 'uint256' }],
    name: 'getPooledAvaxByShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WAVAX: Token = {
  chain: 'avalanche',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract) {
  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const fmtBalanceOf = await call({
    ctx,
    target: contract.address,
    params: [balanceOfRes],
    abi: abi.getPooledAvaxByShares,
  })

  const balance: Balance = {
    ...contract,
    rewards: undefined,
    amount: fmtBalanceOf,
    underlyings: [{ ...WAVAX }],
    category: contract.category as Category,
  }

  return balance
}
