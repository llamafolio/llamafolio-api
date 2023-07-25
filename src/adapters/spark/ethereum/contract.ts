import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getReservesList: {
    inputs: [],
    name: 'getReservesList',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getReserveData: {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'getReserveData',
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256',
                name: 'data',
                type: 'uint256',
              },
            ],
            internalType: 'struct DataTypes.ReserveConfigurationMap',
            name: 'configuration',
            type: 'tuple',
          },
          {
            internalType: 'uint128',
            name: 'liquidityIndex',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'currentLiquidityRate',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'variableBorrowIndex',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'currentVariableBorrowRate',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'currentStableBorrowRate',
            type: 'uint128',
          },
          {
            internalType: 'uint40',
            name: 'lastUpdateTimestamp',
            type: 'uint40',
          },
          {
            internalType: 'uint16',
            name: 'id',
            type: 'uint16',
          },
          {
            internalType: 'address',
            name: 'aTokenAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'stableDebtTokenAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'variableDebtTokenAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'interestRateStrategyAddress',
            type: 'address',
          },
          {
            internalType: 'uint128',
            name: 'accruedToTreasury',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'unbacked',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'isolationModeTotalDebt',
            type: 'uint128',
          },
        ],
        internalType: 'struct DataTypes.ReserveData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserAccountData: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserAccountData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'totalCollateralBase',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'totalDebtBase', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'availableBorrowsBase',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'currentLiquidationThreshold',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'ltv', type: 'uint256' },
      { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendingPoolContracts(ctx: BaseContext, lendingPool: Contract) {
  const contracts: Contract[] = []

  const reservesList = await call({
    ctx,
    target: lendingPool.address,
    abi: abi.getReservesList,
  })

  const reservesDataRes = await multicall({
    ctx,
    calls: reservesList.map(
      (reserveTokenAddress) => ({ target: lendingPool.address, params: [reserveTokenAddress] }) as const,
    ),
    abi: abi.getReserveData,
  })

  for (let i = 0; i < reservesDataRes.length; i++) {
    const reserveDataRes = reservesDataRes[i]
    if (!reserveDataRes.success) {
      continue
    }

    const underlyingToken = reserveDataRes.input.params[0]
    const aToken = reserveDataRes.output.aTokenAddress
    const stableDebtToken = reserveDataRes.output.stableDebtTokenAddress
    const variableDebtToken = reserveDataRes.output.variableDebtTokenAddress

    contracts.push(
      {
        chain: ctx.chain,
        address: aToken,
        underlyings: [underlyingToken],
        category: 'lend',
      },
      {
        chain: ctx.chain,
        address: stableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: true,
      },
      {
        chain: ctx.chain,
        address: variableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: false,
      },
    )
  }

  return contracts
}
