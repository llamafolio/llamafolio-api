import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

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
}

export async function getLendingPoolContracts(chain: Chain, lendingPool: Contract) {
  const contracts: Contract[] = []

  const reservesListRes = await call({
    chain,
    target: lendingPool.address,
    abi: abi.getReservesList,
  })

  const reservesList: string[] = reservesListRes.output

  const reservesDataRes = await multicall({
    chain,
    calls: reservesList.map((reserveTokenAddress) => ({
      target: lendingPool.address,
      params: [reserveTokenAddress],
    })),
    abi: abi.getReserveData,
  })

  for (let i = 0; i < reservesDataRes.length; i++) {
    const reserveDataRes = reservesDataRes[i]
    if (!isSuccess(reserveDataRes)) {
      continue
    }

    const underlyingToken = reserveDataRes.input.params[0]
    const aToken = reserveDataRes.output.aTokenAddress
    const stableDebtToken = reserveDataRes.output.stableDebtTokenAddress
    const variableDebtToken = reserveDataRes.output.variableDebtTokenAddress

    contracts.push(
      {
        chain,
        address: aToken,
        priceSubstitute: underlyingToken,
        underlyings: [underlyingToken],
        category: 'lend',
      },
      {
        chain,
        address: stableDebtToken,
        priceSubstitute: underlyingToken,
        underlyings: [underlyingToken],
        type: 'debt',
        category: 'borrow',
        stable: true,
      },
      {
        chain,
        address: variableDebtToken,
        priceSubstitute: underlyingToken,
        underlyings: [underlyingToken],
        type: 'debt',
        category: 'borrow',
        stable: false,
      },
    )
  }

  return contracts
}

export async function getLendingPoolBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  try {
    const balances: Balance[] = await getERC20BalanceOf(ctx, chain, contracts as Token[])

    // use the same amount for underlyings
    for (const balance of balances) {
      if (balance.amount.gt(0) && balance.underlyings) {
        balance.underlyings[0] = {
          ...balance.underlyings[0],
          amount: BigNumber.from(balance.amount),
        }
      }
    }

    return balances
  } catch (error) {
    return []
  }
}

export async function getLendingPoolHealthFactor(ctx: BaseContext, chain: Chain, lendingPool: Contract) {
  try {
    const userAccountDataRes = await call({
      chain,
      target: lendingPool.address,
      params: [ctx.address],
      abi: abi.getUserAccountData,
    })

    // no borrowed balance
    if (ethers.constants.MaxUint256.eq(userAccountDataRes.output.healthFactor)) {
      return
    }

    const healthFactor = parseFloat(ethers.utils.formatUnits(userAccountDataRes.output.healthFactor, 18))

    // TODO: return other metadata like LTV, available borrow etc
    return healthFactor > 10 ? 10 : healthFactor
  } catch (error) {
    console.log('Failed to get aave-v2 lending pool health factor', error)
    return
  }
}
