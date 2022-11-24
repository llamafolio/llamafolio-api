import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20Balances, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { BigNumber, ethers } from 'ethers'

import EulerAbi from '../abis/Markets.json'

export async function getPositions(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const provider = providers[chain]

  const marketEuler = new ethers.Contract(contracts[0].address, EulerAbi, provider)

  const marketsEntered = await marketEuler.getEnteredMarkets(ctx.address)

  const marketsRaw = await getERC20Details(chain, marketsEntered)

  const callsLend = []
  const callsBorrow = []

  for (let index = 0; index < marketsEntered.length; index++) {
    callsLend.push({
      params: [marketsEntered[index]],
      target: marketEuler.address,
    })

    callsBorrow.push({
      params: [marketsEntered[index]],
      target: marketEuler.address,
    })
  }

  const callsLendRes = await multicall({
    chain: 'ethereum',
    calls: callsLend,
    abi: {
      inputs: [{ internalType: 'address', name: 'underlying', type: 'address' }],
      name: 'underlyingToEToken',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const lendRes = callsLendRes.filter((res) => res.success).map((res) => res.output)

  const callsBorrowRes = await multicall({
    chain: 'ethereum',
    calls: callsBorrow,
    abi: {
      inputs: [{ internalType: 'address', name: 'underlying', type: 'address' }],
      name: 'underlyingToDToken',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const borrowRes = callsBorrowRes.filter((res) => res.success).map((res) => res.output)

  const borrowBalances = await getERC20Balances(ctx, chain, borrowRes)
  const lendBalances = await getERC20Balances(ctx, chain, lendRes)

  const balances: Balance[] = []

  for (let i = 0; i < borrowBalances.length; i++) {
    const borrowBalance = borrowBalances[i]
    balances.push({
      chain: chain,
      category: 'borrow',
      type: 'debt',
      symbol: marketsRaw[i].symbol,
      decimals: marketsRaw[i].decimals,
      address: marketsRaw[i].address,
      amount: BigNumber.from(borrowBalance.amount),
      yieldKey: `${marketsRaw[i].address.toLowerCase()}-euler`,
    })
  }

  for (let i = 0; i < lendBalances.length; i++) {
    const lendBalance = lendBalances[i]
    balances.push({
      chain: chain,
      category: 'lend',
      symbol: marketsRaw[i].symbol,
      decimals: 18, //seems all lending is 18 but borrow isn't?
      address: marketsRaw[i].address,
      amount: BigNumber.from(lendBalance.amount),
      yieldKey: `${marketsRaw[i].address.toLowerCase()}-euler`,
    })
  }

  return balances
}
