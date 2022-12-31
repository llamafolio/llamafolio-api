import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getWStEthStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const converterWStEthToStEthRes = await call({
    chain: 'ethereum',
    target: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    params: [balanceOfRes.output],
    abi: {
      inputs: [{ internalType: 'uint256', name: '_wstETHAmount', type: 'uint256' }],
      name: 'getStETHByWstETH',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const formattedBalanceOf = BigNumber.from(converterWStEthToStEthRes.output)
  const underlying = contract.underlyings?.[0]

  if (underlying) {
    balances.push({
      chain: ctx.chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: formattedBalanceOf,
      underlyings: [{ ...underlying, amount: formattedBalanceOf }],
      category: 'stake',
    })
  }

  return balances
}

export async function getStEthStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const underlying = contract.underlyings?.[0]

  if (underlying) {
    balances.push({
      chain: ctx.chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: balanceOf,
      underlyings: [{ ...underlying, amount: balanceOf }],
      category: 'stake',
    })
  }

  return balances
}

export async function getStMaticBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const converterWStEthToStEthRes = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [balanceOfRes.output],
    abi: {
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
  })

  const formattedBalanceOf = BigNumber.from(converterWStEthToStEthRes.output[0])
  const underlying = contract.underlyings?.[0]

  if (underlying) {
    balances.push({
      chain: ctx.chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: formattedBalanceOf,
      underlyings: [{ ...underlying, amount: formattedBalanceOf }],
      category: 'stake',
    })
  }

  return balances
}
