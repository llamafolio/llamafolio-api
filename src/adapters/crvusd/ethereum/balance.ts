import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  user_state: {
    stateMutability: 'view',
    type: 'function',
    name: 'user_state',
    inputs: [
      {
        name: 'user',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[4]',
      },
    ],
  },
} as const

const crvUSD: Token = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
  symbol: 'crvUSD',
  decimals: 18,
}

export async function getCRVUSDBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
    abi: abi.user_state,
  })

  const balances: Balance[][] = mapSuccessFilter(userBalances, (res, idx) => {
    const [collateralToken, collateralTokenCRVUSD, debt, _] = res.output
    const underlyings = pools[idx].underlyings as Contract[]

    const lend: LendBalance = {
      ...pools[idx],
      amount: collateralToken,
      underlyings,
      rewards: undefined,
      category: 'lend',
    }

    const lendCRVUSD: LendBalance = {
      ...crvUSD,
      amount: collateralTokenCRVUSD,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    const borrow: BorrowBalance = {
      ...crvUSD,
      amount: debt,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    return [lend, lendCRVUSD, borrow]
  })

  return balances.flat()
}
