import type { BalancesContext, BalancesGroup, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { mapSuccess, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  get_controller: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_controller',
    inputs: [{ name: 'collateral', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  health: {
    stateMutability: 'view',
    type: 'function',
    name: 'health',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'int256' }],
  },
  n_collaterals: {
    stateMutability: 'view',
    type: 'function',
    name: 'n_collaterals',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  collaterals: {
    stateMutability: 'view',
    type: 'function',
    name: 'collaterals',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
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

const crvUSDControllerFactory: Contract = {
  chain: 'ethereum',
  address: '0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC',
}

const crvUsd: Token = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
  name: 'Curve.Fi USD Stablecoin',
  symbol: 'crvUSD',
  decimals: 18,
}

async function getControllers(ctx: BaseContext) {
  const collateralsCount = await call({ ctx, target: crvUSDControllerFactory.address, abi: abi.n_collaterals })

  const collaterals = await multicall({
    ctx,
    calls: rangeBI(0n, collateralsCount).map(
      (idx) => ({ target: crvUSDControllerFactory.address, params: [idx] } as const),
    ),
    abi: abi.collaterals,
  })

  const controllers = await multicall({
    ctx,
    calls: mapSuccess(
      collaterals,
      (collateralRes) => ({ target: crvUSDControllerFactory.address, params: [collateralRes.output] } as const),
    ),
    abi: abi.get_controller,
  })

  const contracts: Contract[] = mapSuccessFilter(controllers, (controllerRes) => {
    const collateral = controllerRes.input.params[0]
    const controller = controllerRes.output

    return {
      chain: ctx.chain,
      address: controller,
      underlyings: [collateral],
    }
  })

  return contracts
}

export const getControllersBalancesGroups = async (ctx: BalancesContext, controllers: Contract[]) => {
  const groups: BalancesGroup[] = []

  const [userStates, healths] = await Promise.all([
    multicall({
      ctx,
      abi: abi.user_state,
      calls: controllers.map((controller) => ({ target: controller.address, params: [ctx.address] } as const)),
    }),
    multicall({
      ctx,
      abi: abi.health,
      calls: controllers.map((controller) => ({ target: controller.address, params: [ctx.address] } as const)),
    }),
  ])

  for (let controllerIdx = 0; controllerIdx < controllers.length; controllerIdx++) {
    const userStateRes = userStates[controllerIdx]
    const healthRes = healths[controllerIdx]
    const underlying = controllers[controllerIdx].underlyings?.[0] as Contract

    if (!userStateRes.success || !healthRes.success || !underlying) {
      continue
    }

    const [collateral, stablecoin, debt] = userStateRes.output
    const healthFactor = healthRes.output

    groups.push({
      healthFactor: (100 * Number(healthFactor)) / 1e18,
      balances: [
        {
          ...controllers[controllerIdx],
          category: 'lend',
          amount: collateral,
          rewards: undefined,
          underlyings: [
            { ...underlying, amount: collateral },
            { ...crvUsd, amount: stablecoin, stable: true },
          ],
        },
        {
          ...crvUsd,
          amount: debt,
          category: 'borrow',
          stable: true,
        },
      ],
    })
  }

  return groups
}

export const getContracts = async (ctx: BaseContext) => {
  const controllers = await getControllers(ctx)

  return {
    contracts: { controllers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const groups = await getControllersBalancesGroups(ctx, contracts.controllers || [])

  return { groups }
}
