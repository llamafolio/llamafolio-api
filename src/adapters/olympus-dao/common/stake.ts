import type { Balance, Contract } from '@lib/adapter'
import type { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
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

export async function getStakeBalances(ctx: BalancesContext, stakers: Contract[]) {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (const staker of stakers) {
    calls.push({ target: staker.address, params: [ctx.address] })
  }

  const balancesOfRes = await multicall({ ctx, calls, abi: abi.balanceOf })

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const balanceOfRes = balancesOfRes[idx]

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    balances.push({
      ...staker,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: [OHM],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

export async function getFormattedStakeBalances(ctx: BalancesContext, contract: Contract) {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = balanceOfRes.output

  const formattedBalanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abiOlympus.balanceFrom,
  })

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfRes.output)

  const balance: Balance = {
    chain: ctx.chain,
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
