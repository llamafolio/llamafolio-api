import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers/lib/ethers'

const abiOlympus = {
  balanceFrom: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'balanceFrom',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const OHM: Contract = {
  name: 'Olympus',
  chain: 'ethereum',
  address: '0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5',
  symbol: 'OHM',
  decimals: 9,
}

export async function getStakeBalances(ctx: BalancesContext, chain: Chain, contract: Contract) {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount,
    underlyings: [OHM],
    category: 'stake',
  }
  balances.push(balance)

  return balances
}

export async function getFormattedStakeBalances(ctx: BalancesContext, chain: Chain, contract: Contract) {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = balanceOfRes.output

  const formattedBalanceOfRes = await call({
    chain,
    target: contract.address,
    params: [balanceOf],
    abi: abiOlympus.balanceFrom,
  })

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: formattedBalanceOf,
    underlyings: [OHM],
    category: 'stake',
  }

  balances.push(balance)
  return balances
}
