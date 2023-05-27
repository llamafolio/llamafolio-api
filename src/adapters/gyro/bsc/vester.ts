import type { BalancesContext, Contract, VestBalance } from '@lib/adapter'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  bondInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'bondInfo',
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

const GYRO: Token = {
  chain: 'bsc',
  address: '0x1b239abe619e74232c827fbe5e49a4c072bd869d',
  decimals: 9,
  symbol: 'GYRO',
}

export async function getGyroVesterBalances(ctx: BalancesContext, vesters: Contract[]): Promise<VestBalance[]> {
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

    const [payout, _vesting, lastBlock] = bondInfoRes.output

    const provider = providers[ctx.chain]
    const unlockAt = Number((await provider.getBlock({ blockNumber: lastBlock })).timestamp)

    balances.push({
      ...vester,
      amount: BigNumber.from(payout),
      claimable: now > unlockAt ? BigNumber.from(payout) : BN_ZERO,
      unlockAt,
      decimals: 9,
      underlyings: [GYRO],
      rewards: undefined,
      category: 'vest',
    })
  }

  return balances
}
