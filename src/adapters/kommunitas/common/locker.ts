import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getStakedDetail: {
    inputs: [
      { internalType: 'address', name: '_staker', type: 'address' },
      { internalType: 'uint232', name: '_userStakedIndex', type: 'uint232' },
    ],
    name: 'getStakedDetail',
    outputs: [
      { internalType: 'uint128', name: 'lockPeriodInDays', type: 'uint128' },
      { internalType: 'enum KommunitasStakingV3.CompoundTypes', name: 'compoundType', type: 'uint8' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'reward', type: 'uint256' },
      { internalType: 'uint256', name: 'prematurePenalty', type: 'uint256' },
      { internalType: 'uint128', name: 'stakedAt', type: 'uint128' },
      { internalType: 'uint128', name: 'endedAt', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userStakedLength: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'userStakedLength',
    outputs: [{ internalType: 'uint256', name: 'length', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const KOM: { [key: string]: Contract } = {
  polygon: {
    chain: 'polygon',
    address: '0xc004e2318722ea2b15499d6375905d75ee5390b8',
    decimals: 8,
    symbol: 'KOM',
  },
  arbitrum: {
    chain: 'arbitrum',
    address: '0xa58663faef461761e44066ea26c1fcddf2927b80',
    decimals: 8,
    symbol: 'KOM',
  },
}

export async function getKommuLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userPosLength = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.userStakedLength })

  const userPositions = await multicall({
    ctx,
    calls: rangeBI(0n, userPosLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.getStakedDetail,
  })

  return mapSuccessFilter(userPositions, (res) => {
    const now = Date.now() / 1000
    const [_, __, amount, reward, ___, ____, endedAt] = res.output
    const unlockAt = Number(endedAt)

    return {
      ...locker,
      amount,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      underlyings: undefined,
      rewards: [{ ...KOM[ctx.chain], amount: reward }],
      category: 'lock',
    }
  })
}
