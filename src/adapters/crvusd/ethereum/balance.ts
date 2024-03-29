import type { BalancesContext, BalancesGroup, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  user_state: {
    stateMutability: 'view',
    type: 'function',
    name: 'user_state',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
  },
  health: {
    stateMutability: 'view',
    type: 'function',
    name: 'health',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'int256' }],
  },
} as const

const crvUSD: Token = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
  symbol: 'crvUSD',
  decimals: 18,
}

export async function getControllersBalances(ctx: BalancesContext, controllers: Contract[]) {
  const [userStates, healthsRes] = await Promise.all([
    multicall({
      ctx,
      calls: controllers.map((controller) => ({ target: controller.address, params: [ctx.address] }) as const),
      abi: abi.user_state,
    }),
    multicall({
      ctx,
      calls: controllers.map((controller) => ({ target: controller.address, params: [ctx.address] }) as const),
      abi: abi.health,
    }),
  ])

  const groups: BalancesGroup[] = mapSuccessFilter(userStates, (res, idx) => {
    const controller = controllers[idx]
    const underlyings = controller.underlyings as Contract[]
    const healthFactor =
      healthsRes[idx].success && healthsRes[idx].output !== null ? 1 + Number(healthsRes[idx].output) / 1e18 : undefined
    const [collateralToken, collateralTokenCRVUSD, debt, _] = res.output

    const lend: LendBalance = {
      ...controller,
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

    return { healthFactor, balances: [lend, lendCRVUSD, borrow] }
  })

  return groups
}
