import type { Balance, Contract } from '@lib/adapter'
import type { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers/lib/ethers'

const FLOOR: Contract = {
  name: 'Floor',
  chain: 'ethereum',
  address: '0xf59257E961883636290411c11ec5Ae622d19455e',
  decimals: 9,
  symbol: 'FLOOR ',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOf)

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...FLOOR, amount }],
    category: 'stake',
  })

  return balances
}

export async function getFormattedStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const formattedBalanceOfBI = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
      name: 'balanceFrom',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfBI)

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: formattedBalanceOf,
    underlyings: [{ ...FLOOR, amount: formattedBalanceOf }],
    category: 'stake',
  })

  return balances
}
