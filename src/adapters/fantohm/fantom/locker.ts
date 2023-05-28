import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  balanceOfVotingToken: {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'balanceOfVotingToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const FHM: Token = {
  chain: 'fantom',
  address: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
  decimals: 9,
  symbol: 'FHM',
}

export async function getFantohmLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const balancesOfsRes = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] } as const)),
    abi: abi.balanceOfVotingToken,
  })

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const balancesOfRes = balancesOfsRes[lockerIdx]

    if (!balancesOfRes.success) {
      continue
    }

    balances.push({
      ...locker,
      amount: balancesOfRes.output,
      decimals: 9,
      underlyings: [FHM],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
