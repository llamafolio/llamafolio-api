import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getCurrencyBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getCurrencyBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const CAP: Token = {
  chain: 'arbitrum',
  address: '0x031d35296154279DC1984dCD93E392b1f946737b',
  decimals: 18,
  symbol: 'CAP',
}

export async function getDepositBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (const contract of contracts) {
    calls.push({ target: contract.address, params: [ctx.address] })
  }

  const getCurrencyBalancesOf = await multicall({ ctx, calls, abi: abi.getCurrencyBalance })

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const underlying = contract.underlyings?.[0] as Contract
    const getCurrencyBalanceOf = getCurrencyBalancesOf[poolIdx]

    if (!underlying || !isSuccess(getCurrencyBalanceOf)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(getCurrencyBalanceOf.output),
      symbol: underlying.symbol,
      decimals: 18,
      underlyings: [underlying],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balanceOfRes = await call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getBalance })

  return {
    ...contract,
    amount: BigNumber.from(balanceOfRes.output),
    symbol: CAP.symbol,
    decimals: 18,
    underlyings: [CAP],
    rewards: undefined,
    category: 'stake',
  }
}
