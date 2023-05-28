import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  wsHECTosHEC: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wsHECTosHEC',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const HEC: Contract = {
  name: 'Hector',
  chain: 'fantom',
  address: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
  decimals: 9,
  symbol: 'HEC',
}

export async function getsStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const amount = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...HEC, amount }],
    category: 'stake',
  }

  return balance
}

export async function getWsStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const amount = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abi.wsHECTosHEC,
  })

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...HEC, amount }],
    category: 'stake',
  }

  return balance
}
