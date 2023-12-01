import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  currentEra: {
    inputs: [],
    name: 'currentEra',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  draftQueueLen: {
    inputs: [
      { internalType: 'uint256', name: 'era_', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'draftQueueLen',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  draftQueues: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'draftQueues',
    outputs: [
      { internalType: 'uint176', name: 'drafts', type: 'uint176' },
      { internalType: 'uint64', name: 'availableAt', type: 'uint64' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint192', name: '', type: 'uint192' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getReserveLockers(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const [currentEra, pricePerFullShare] = await Promise.all([
    call({ ctx, target: locker.address, abi: abi.currentEra }),
    call({ ctx, target: locker.address, abi: abi.exchangeRate }),
  ])

  const userBalancesLength = await multicall({
    ctx,
    calls: rangeBI(0n, currentEra + 1n).map((i) => ({ target: locker.address, params: [i, ctx.address] }) as const),
    abi: abi.draftQueueLen,
  })

  const userBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesLength, (res) => {
      if (res.output === 0n) return []
      return rangeBI(0n, res.output).map(
        (index) =>
          ({
            target: res.input.target,
            params: [res.input.params[0], ctx.address, index],
          }) as const,
      )
    }).flat(),
    abi: abi.draftQueues,
  })

  return mapSuccessFilter(userBalances, (res) => {
    const now = Date.now() / 1000
    const [amount, end] = res.output
    const unlockAt = Number(end)

    const underlying = {
      ...(locker.underlyings![0] as Contract),
      amount: (amount * pricePerFullShare) / parseEther('1.0'),
    }

    return {
      ...locker,
      amount,
      unlockAt,
      claimable: now > unlockAt ? amount : 0n,
      underlyings: [underlying],
      rewards: undefined,
      category: 'lock',
    }
  })
}
