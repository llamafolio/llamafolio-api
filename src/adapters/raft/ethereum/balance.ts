import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  MCR: {
    inputs: [],
    name: 'MCR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const R: Token = {
  chain: 'ethereum',
  address: '0x183015a9bA6fF60230fdEaDc3F43b3D788b13e21',
  decimals: 18,
  symbol: 'R',
}

const splitLiquidation: Contract = {
  chain: 'ethereum',
  address: '0x8506d8516e9204b1a9221bcff7e024a0947460b3',
}

export async function getRaftBalances(ctx: BalancesContext, pools: Contract[]) {
  const [userLendBalancesRes, userDebtBalancesRes, MCR] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.debt[0].address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    call({ ctx, target: splitLiquidation.address, abi: abi.MCR }),
  ])

  return pools
    .map((pool, index) => {
      const userLendBalanceRes = userLendBalancesRes[index]
      const userDebtBalanceRes = userDebtBalancesRes[index]

      if (!userLendBalanceRes.success || !userDebtBalanceRes.success) {
        return null
      }

      const lendBalance: LendBalance = {
        ...pool,
        amount: userLendBalanceRes.output,
        underlyings: pool.underlyings as Contract[],
        rewards: undefined,
        category: 'lend',
        MCR: parseFloatBI(MCR, 18),
      }

      const borrowBalance: BorrowBalance = {
        ...pool.debt[0],
        amount: userDebtBalanceRes.output,
        underlyings: [R],
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lendBalance, borrowBalance] }
    })
    .filter(isNotNullish)
}
