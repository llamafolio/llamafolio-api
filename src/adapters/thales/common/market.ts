import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getNeededStakedThalesToWithdrawForUser: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getNeededStakedThalesToWithdrawForUser',
    outputs: [{ internalType: 'uint256', name: 'neededStaked', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  round: {
    inputs: [],
    name: 'round',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositReceipts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositReceipts',
    outputs: [
      { internalType: 'uint256', name: 'round', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getBalancesPerRound: {
    inputs: [
      { internalType: 'uint256', name: '_round', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getBalancesPerRound',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getThalesAMMVaultBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  const currentRound = await multicall({
    ctx,
    calls: markets.map((market) => ({ target: market.address }) as const),
    abi: abi.round,
  })

  const userBalancesAtCurrentRound = await multicall({
    ctx,
    calls: mapSuccessFilter(
      currentRound,
      (res) => ({ target: res.input.target, params: [res.output, ctx.address] }) as const,
    ),
    abi: abi.getBalancesPerRound,
  })

  return mapSuccessFilter(userBalancesAtCurrentRound, (res, index) => ({
    ...markets[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }))
}
