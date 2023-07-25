import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  nextReserveId: {
    inputs: [],
    name: 'nextReserveId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  reserves: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'reserves',
    outputs: [
      {
        internalType: 'uint256',
        name: 'borrowingIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'currentBorrowingRate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalBorrows',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'underlyingTokenAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'eTokenAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'stakingAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'reserveCapacity',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint128',
            name: 'utilizationA',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'borrowingRateA',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'utilizationB',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'borrowingRateB',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'maxBorrowingRate',
            type: 'uint128',
          },
        ],
        internalType: 'struct DataTypes.InterestRateConfig',
        name: 'borrowingRateConfig',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint128',
        name: 'lastUpdateTimestamp',
        type: 'uint128',
      },
      {
        internalType: 'uint16',
        name: 'reserveFeeRate',
        type: 'uint16',
      },
      {
        components: [
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'frozen',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'borrowingEnabled',
            type: 'bool',
          },
        ],
        internalType: 'struct DataTypes.Flags',
        name: 'flags',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getExtraPools(ctx: BaseContext, lendingPool: Contract): Promise<Contract[]> {
  const poolsLength = await call({ ctx, target: lendingPool.address, abi: abi.nextReserveId })

  const poolsInfosRes = await multicall({
    ctx,
    // The first address is a test address
    calls: rangeBI(1n, poolsLength).map((idx) => ({ target: lendingPool.address, params: [idx] }) as const),
    abi: abi.reserves,
  })

  return mapSuccessFilter(poolsInfosRes, (res, idx) => {
    const [
      _borrowingIndex,
      _currentBorrowingRate,
      _totalBorrows,
      underlyingTokenAddress,
      eTokenAddress,
      stakingAddress,
      _reserveCapacity,
    ] = res.output

    return {
      chain: ctx.chain,
      address: stakingAddress,
      token: eTokenAddress,
      underlyings: [underlyingTokenAddress],
      pid: idx + 1,
      lendingPool,
    }
  })
}
