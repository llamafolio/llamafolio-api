import type { BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  collateral: {
    inputs: [],
    name: 'collateral',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  dola: {
    inputs: [],
    name: 'dola',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  oracle: {
    inputs: [],
    name: 'oracle',
    outputs: [
      {
        internalType: 'contract IOracle',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  debts: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'debts',
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
  getCollateralValue: {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'getCollateralValue',
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
  getFeedPrice: {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'getFeedPrice',
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
  escrows: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'escrows',
    outputs: [
      {
        internalType: 'contract IEscrow',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balance: {
    inputs: [],
    name: 'balance',
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
  collateralFactorBps: {
    inputs: [],
    name: 'collateralFactorBps',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DOLA: Token = {
  chain: 'ethereum',
  address: '0x865377367054516e17014CcdED1e7d814EDC9ce4',
  decimals: 18,
  symbol: 'DOLA',
}

export async function getInverseMarketsContracts(ctx: BaseContext, markets: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const [collateralTokensRes, oraclesRes] = await Promise.all([
    multicall({ ctx, calls: markets.map((market) => ({ target: market.address }) as const), abi: abi.collateral }),
    multicall({ ctx, calls: markets.map((market) => ({ target: market.address }) as const), abi: abi.oracle }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const collateralTokenRes = collateralTokensRes[marketIdx]
    const oracleRes = oraclesRes[marketIdx]

    if (!collateralTokenRes.success || !oracleRes.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: market.address,
      token: collateralTokenRes.output,
      oracle: oracleRes.output,
    })
  }

  return contracts
}

export async function getInverseMarketsBalances(ctx: BalancesContext, markets: Contract[]) {
  const [userDebtsRes, escrowsRes, collateralFactorsRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: abi.debts,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: abi.escrows,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address }) as const),
      abi: abi.collateralFactorBps,
    }),
  ])

  const escrowsBalancesRes = await multicall({
    ctx,
    calls: mapSuccessFilter(escrowsRes, (res) => ({ target: res.output }) as const),
    abi: abi.balance,
  })

  return markets
    .map((market, marketIdx) => {
      const userDebtRes = userDebtsRes[marketIdx]
      const escrowsBalanceRes = escrowsBalancesRes[marketIdx]
      const collateralFactorRes = collateralFactorsRes[marketIdx]

      if (!userDebtRes.success || !escrowsBalanceRes.success) {
        return null
      }

      const lend: LendBalance = {
        ...market,
        amount: escrowsBalanceRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
        collateralFactor: collateralFactorRes.output != null ? collateralFactorRes.output * 10n ** 14n : undefined,
      }

      const borrow: BorrowBalance = {
        ...DOLA,
        amount: userDebtRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lend, borrow] }
    })
    .filter(isNotNullish)
}
