import type { BalancesContext, Contract, VestBalance } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  bondInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'bondInfo',
    outputs: [
      { internalType: 'uint256', name: 'payout', type: 'uint256' },
      { internalType: 'uint256', name: 'pricePaid', type: 'uint256' },
      { internalType: 'uint32', name: 'lastTime', type: 'uint32' },
      { internalType: 'uint32', name: 'vesting', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SB: Token = {
  chain: 'avalanche',
  address: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
  decimals: 9,
  symbol: 'SB',
}

export async function getSBVesterBalances(ctx: BalancesContext, vesters: Contract[]): Promise<VestBalance[]> {
  const balances: VestBalance[] = []
  const now = Math.floor(Date.now() / 1000)

  const bondInfosRes = await multicall({
    ctx,
    calls: vesters.map((vester) => ({ target: vester.address, params: [ctx.address] } as const)),
    abi: abi.bondInfo,
  })

  for (let vesterIdx = 0; vesterIdx < vesters.length; vesterIdx++) {
    const vester = vesters[vesterIdx]
    const bondInfoRes = bondInfosRes[vesterIdx]

    if (!bondInfoRes.success) {
      continue
    }

    const [payout, _pricePaid, lastTime, _vesting] = bondInfoRes.output

    const unlockAt = Number(lastTime)

    balances.push({
      ...vester,
      amount: payout,
      claimable: now > unlockAt ? payout : 0n,
      unlockAt,
      decimals: 9,
      underlyings: [SB],
      rewards: undefined,
      category: 'vest',
    })
  }

  return balances
}
