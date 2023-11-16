import type { BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  collateralTypes: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'collateralTypes',
    outputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'contract IPriceSource', name: 'priceSource', type: 'address' },
      { internalType: 'uint256', name: 'debtFloor', type: 'uint256' },
      { internalType: 'uint256', name: 'debtCeiling', type: 'uint256' },
      { internalType: 'uint256', name: 'collateralRatio', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRate', type: 'uint256' },
      { internalType: 'uint256', name: 'totalCollateral', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUpdateTime', type: 'uint256' },
      { internalType: 'uint256', name: 'initialDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'cumulativeInterest', type: 'uint256' },
      { internalType: 'bool', name: 'borrowingEnabled', type: 'bool' },
      { internalType: 'bool', name: 'allowlistEnabled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getOwnedVaults: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'getOwnedVaults',
    outputs: [{ internalType: 'uint256[]', name: 'ownedVaults_', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCollateralToken: {
    inputs: [{ internalType: 'uint256', name: 'vaultId', type: 'uint256' }],
    name: 'getCollateralToken',
    outputs: [{ internalType: 'contract IERC20', name: 'collateralToken', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCollateralAmount: {
    inputs: [{ internalType: 'uint256', name: 'vaultId', type: 'uint256' }],
    name: 'getCollateralAmount',
    outputs: [{ internalType: 'uint256', name: 'collateralAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDebt: {
    inputs: [{ internalType: 'uint256', name: 'vaultId', type: 'uint256' }],
    name: 'getDebt',
    outputs: [{ internalType: 'uint256', name: 'debt', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDT: Token = {
  chain: 'arbitrum',
  address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  decimals: 6,
  symbol: 'USDT',
}

export async function getCDPCollateralAssets(ctx: BaseContext, CDP: Contract): Promise<Contract[]> {
  const COLLATERAL_TYPES_LENGTH = 6n

  const collateralTypesRes = await multicall({
    ctx,
    calls: rangeBI(0n, COLLATERAL_TYPES_LENGTH).map((i) => ({ target: CDP.address, params: [i] }) as const),
    abi: abi.collateralTypes,
  })

  return mapSuccessFilter(collateralTypesRes, (res) => {
    const [token, _, __, ___, MCR] = res.output

    return { chain: ctx.chain, address: token, MCR: parseFloatBI(MCR, 18), collateralId: res.input.params[0] }
  })
}

export async function getCDPBalances(ctx: BalancesContext, CDP: Contract, assets: Contract[]) {
  const userOwnedVaultsIds = await call({ ctx, target: CDP.address, params: [ctx.address], abi: abi.getOwnedVaults })

  const [getCollateralTokensRes, getCollateralBalancesRes, getDebtBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: userOwnedVaultsIds.map((vaultId) => ({ target: CDP.address, params: [vaultId] }) as const),
      abi: abi.getCollateralToken,
    }),
    multicall({
      ctx,
      calls: userOwnedVaultsIds.map((vaultId) => ({ target: CDP.address, params: [vaultId] }) as const),
      abi: abi.getCollateralAmount,
    }),
    multicall({
      ctx,
      calls: userOwnedVaultsIds.map((vaultId) => ({ target: CDP.address, params: [vaultId] }) as const),
      abi: abi.getDebt,
    }),
  ])

  return mapMultiSuccessFilter(
    getCollateralTokensRes.map((_, i) => [
      getCollateralTokensRes[i],
      getCollateralBalancesRes[i],
      getDebtBalancesRes[i],
    ]),

    (res) => {
      const [{ output: token }, { output: lendBalance }, { output: borrowBalance }] = res.inputOutputPairs

      const collateral = assets.find((asset) => asset.address.toLowerCase() === token.toLowerCase())

      if (!collateral) return null

      const lend: LendBalance = {
        ...collateral,
        amount: lendBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrow: BorrowBalance = {
        ...USDT,
        decimals: 18,
        amount: borrowBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lend, borrow] }
    },
  ).filter(isNotNullish)
}
