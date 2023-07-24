import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getBalancesOf } from '@lib/erc20'
import { MAX_UINT_256 } from '@lib/math'
import { multicall } from '@lib/multicall'
import { formatUnits } from 'viem'

const abi = {
  getReservesList: {
    inputs: [],
    name: 'getReservesList',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserveData: {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'getReserveData',
    outputs: [
      {
        components: [
          {
            components: [{ internalType: 'uint256', name: 'data', type: 'uint256' }],
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
            name: 'variableBorrowIndex',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'currentLiquidityRate',
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
          { internalType: 'uint8', name: 'id', type: 'uint8' },
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

export async function getLendingPoolBalances(ctx: BalancesContext, contracts: Contract[]) {
  try {
    const balances = await getBalancesOf(ctx, contracts)

    // use the same amount for underlyings
    for (const balance of balances) {
      if (balance.amount > 0n && balance.underlyings) {
        balance.underlyings[0] = { ...balance.underlyings[0], amount: balance.amount }
      }
    }

    return balances
  } catch (error) {
    return []
  }
}

export async function getLendingPoolHealthFactor(ctx: BalancesContext, lendingPool: Contract) {
  const userAccountDataRes = await call({
    ctx,
    target: lendingPool.address,
    params: [ctx.address],
    abi: abi.getUserAccountData,
  })
  const [
    _totalCollateralBase,
    _totalDebtBase,
    _availableBorrowsBase,
    _currentLiquidationThreshold,
    _ltv,
    healthFactorBI,
  ] = userAccountDataRes

  // no borrowed balance
  if (healthFactorBI === MAX_UINT_256) {
    return
  }

  const healthFactor = parseFloat(formatUnits(healthFactorBI, 18))

  // TODO: return other metadata like LTV, available borrow etc
  return healthFactor
}
