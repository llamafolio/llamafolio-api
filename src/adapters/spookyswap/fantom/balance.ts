import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  xBOOForBOO: {
    inputs: [{ internalType: 'uint256', name: '_xBOOAmount', type: 'uint256' }],
    name: 'xBOOForBOO',
    outputs: [{ internalType: 'uint256', name: 'booAmount_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BOO: Token = {
  chain: 'fantom',
  address: '0x841fad6eae12c286d1fd18d1d525dffa75c7effe',
  decimals: 18,
  symbol: 'BOO',
}

export async function getStakexBOOBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const xBOOForBOORes = await call({ ctx, target: contract.address, params: [balanceOf], abi: abi.xBOOForBOO })

  balances.push({
    ...contract,
    amount: BigNumber.from(balanceOf),
    underlyings: [{ ...BOO, amount: BigNumber.from(xBOOForBOORes) }],
    rewards: undefined,
    category: 'stake',
  })

  return balances
}
