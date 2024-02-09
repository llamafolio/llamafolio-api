import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  barterInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'barterInfo',
    outputs: [
      { internalType: 'uint256', name: 'payout', type: 'uint256' },
      { internalType: 'uint256', name: 'vesting', type: 'uint256' },
      { internalType: 'uint256', name: 'lastBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'pricePaid', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USV: Token = {
  chain: 'polygon',
  address: '0xac63686230f64bdeaf086fe6764085453ab3023f',
  symbol: 'USV',
  decimals: 9,
}

export async function getVestingBalances(ctx: BalancesContext, vesters: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const pendingPayoutBalancesRes = await multicall({
    ctx,
    calls: vesters.map((vester) => ({ target: vester.address, params: [ctx.address] }) as const),
    abi: abi.barterInfo,
  })

  for (let vesterIdx = 0; vesterIdx < vesters.length; vesterIdx++) {
    const vester = vesters[vesterIdx]
    const pendingPayoutBalanceRes = pendingPayoutBalancesRes[vesterIdx]

    if (!pendingPayoutBalanceRes.success) {
      continue
    }

    const [payout, _vesting, lastBlock] = pendingPayoutBalanceRes.output

    const unlockAt = Number((await ctx.client.getBlock({ blockNumber: lastBlock })).timestamp)

    balances.push({
      ...vester,
      decimals: USV.decimals,
      symbol: USV.symbol,
      amount: payout,
      unlockAt,
      underlyings: [USV],
      rewards: undefined,
      category: 'vest',
    })
  }

  return balances
}
