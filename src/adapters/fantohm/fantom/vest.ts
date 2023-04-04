import { BalancesContext, Contract, VestBalance } from '@lib/adapter'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
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
}

const FHM: Token = {
  chain: 'fantom',
  address: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
  decimals: 9,
  symbol: 'FHM',
}

export async function getFHMVesterBalances(ctx: BalancesContext, vesters: Contract[]): Promise<VestBalance[]> {
  const balances: VestBalance[] = []
  const now = Math.floor(Date.now() / 1000)

  const bondInfosRes = await multicall({
    ctx,
    calls: vesters.map((vester) => ({ target: vester.address, params: [ctx.address] })),
    abi: abi.bondInfo,
  })

  for (let vesterIdx = 0; vesterIdx < vesters.length; vesterIdx++) {
    const vester = vesters[vesterIdx]
    const bondInfoRes = bondInfosRes[vesterIdx]

    if (!isSuccess(bondInfoRes)) {
      continue
    }

    const provider = providers[ctx.chain]
    const unlockAt = (await provider.getBlock(parseInt(bondInfoRes.output.lastBlock))).timestamp

    balances.push({
      ...vester,
      amount: BigNumber.from(bondInfoRes.output.payout),
      claimable: now > unlockAt ? BigNumber.from(bondInfoRes.output.payout) : BN_ZERO,
      unlockAt,
      decimals: 9,
      underlyings: [FHM],
      rewards: undefined,
      category: 'vest',
    })
  }

  return balances
}
