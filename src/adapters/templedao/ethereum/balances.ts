import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  firstPeriodStartTimestamp: {
    inputs: [],
    name: 'firstPeriodStartTimestamp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  periodDuration: {
    inputs: [],
    name: 'periodDuration',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TEMPLE: Contract = {
  name: 'Temple',
  displayName: 'Temple Token',
  chain: 'ethereum',
  address: '0x470ebf5f030ed85fc1ed4c2d36b9dd02e77cf1b7',
  decimals: 18,
  symbol: 'TEMPLE ',
}

export async function getStakeBalances(
  ctx: BalancesContext,
  contract: Contract,
  templeStaking: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const formattedBalanceRes = await call({
    ctx,
    target: templeStaking.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: 'amountOgTemple', type: 'uint256' }],
      name: 'balance',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const formattedBalance = formattedBalanceRes

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount: formattedBalance,
    underlyings: [{ ...TEMPLE, amount: formattedBalance }],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}

export async function getLockedBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const calls = contracts.map((contract) => ({ target: contract.address }))

  const [balancesLockedRes, periodStartTimestampRes, periodDurationRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls, abi: abi.firstPeriodStartTimestamp }),
    multicall({ ctx, calls, abi: abi.periodDuration }),
  ])

  return contracts
    .map((contract, i) => {
      if (!TEMPLE || !balancesLockedRes[i].success) {
        return
      }

      const amountLocked = balancesLockedRes[i].output

      const balance: Balance = {
        chain: ctx.chain,
        decimals: contract.decimals,
        symbol: contract.symbol,
        address: contract.address,
        amount: amountLocked,
        underlyings: [{ ...TEMPLE, amount: amountLocked }],
        category: 'lock',
      }

      const periodStartTimestamp = periodStartTimestampRes[i]
      const periodDuration = periodDurationRes[i]

      // end lock
      if (periodStartTimestamp.success && periodDuration.success) {
        balance.unlockAt = Number(periodDuration.output + periodDuration.output)
      }

      return balance
    })
    .filter(isNotNullish)
}
