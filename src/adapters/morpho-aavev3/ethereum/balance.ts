import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  collateralBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'collateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  borrowBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'borrowBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  supplyBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'supplyBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  liquidityData: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'liquidityData',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'borrowable', type: 'uint256' },
          { internalType: 'uint256', name: 'maxDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'debt', type: 'uint256' },
        ],
        internalType: 'struct Types.LiquidityData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendBorrowBalancesAaveV3(ctx: BalancesContext, markets: Contract[], comptroller: Contract) {
  const [lendBalancesRes, borrowBalancesRes, suppliedBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: comptroller.address, params: [market.address, ctx.address] }) as const),
      abi: abi.collateralBalance,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: comptroller.address, params: [market.address, ctx.address] }) as const),
      abi: abi.borrowBalance,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: comptroller.address, params: [market.address, ctx.address] }) as const),
      abi: abi.supplyBalance,
    }),
  ])

  return mapMultiSuccessFilter(
    lendBalancesRes.map((_, i) => [lendBalancesRes[i], borrowBalancesRes[i], suppliedBalancesRes[i]]),

    (res, index) => {
      const market = markets[index]
      const [{ output: lendBalance }, { output: borrowBalance }, { output: supplyBalance }] = res.inputOutputPairs

      const lend: Balance = {
        ...market,
        amount: lendBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const supply: Balance = {
        ...market,
        amount: supplyBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrow: Balance = {
        ...market,
        amount: borrowBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lend, supply, borrow]
    },
  )
}

export async function getUserHealthFactorV3(ctx: BalancesContext, comptroller: Contract): Promise<number | undefined> {
  const healthFactor = await call({ ctx, target: comptroller.address, params: [ctx.address], abi: abi.liquidityData })

  if (healthFactor.debt === 0n) {
    return undefined
  }

  return Number(healthFactor.maxDebt) / Number(healthFactor.debt)
}
