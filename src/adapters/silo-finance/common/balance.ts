import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { groupBy, mapMultiSuccessFilter } from '@lib/array'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

const abi = {
  collateralBalanceOfUnderlying: {
    inputs: [
      { internalType: 'contract ISilo', name: '_silo', type: 'address' },
      { internalType: 'address', name: '_asset', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'collateralBalanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  debtBalanceOfUnderlying: {
    inputs: [
      { internalType: 'contract ISilo', name: '_silo', type: 'address' },
      { internalType: 'address', name: '_asset', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'debtBalanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserLTV: {
    inputs: [
      { internalType: 'contract ISilo', name: '_silo', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getUserMaximumLTV',
    outputs: [{ internalType: 'uint256', name: 'maximumLTV', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type SiloBalance = Balance & {
  silo?: `0x${string}`
}

export async function getSiloBalances(ctx: BalancesContext, routers: Contract[], lens: Contract) {
  const pools = routers
    .flatMap((router) => router.underlyings as Contract[])
    .filter((pool, index, self) => self.findIndex((p) => p.address === pool.address && p.silo === pool.silo) === index)

  const [userCollateral, userDebt, userLtv] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: lens.address, params: [pool.silo, pool.address, ctx.address] }) as const),
      abi: abi.collateralBalanceOfUnderlying,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: lens.address, params: [pool.silo, pool.address, ctx.address] }) as const),
      abi: abi.debtBalanceOfUnderlying,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: lens.address, params: [pool.silo, ctx.address] }) as const),
      abi: abi.getUserLTV,
    }),
  ])

  const poolBalances: SiloBalance[][] = mapMultiSuccessFilter(
    userCollateral.map((_, i) => [userCollateral[i], userDebt[i], userLtv[i]]),

    (res, index) => {
      const pool = pools[index]

      const [{ output: collateral }, { output: debt }, { output: ltv }] = res.inputOutputPairs
      const MCR = 1 / parseFloatBI(ltv, 18)

      const lendBalance: LendBalance = {
        ...pool,
        amount: collateral,
        underlyings: undefined,
        rewards: undefined,
        MCR,
        category: 'lend',
      }

      const borrowBalance: BorrowBalance = {
        ...pool,
        amount: debt,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lendBalance, borrowBalance]
    },
  )

  return Object.values(groupBy(poolBalances.flat(), 'silo')).map((balance) => ({ balances: balance }))
}
