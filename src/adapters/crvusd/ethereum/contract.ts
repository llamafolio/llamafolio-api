import type { BaseContext, Contract } from '@lib/adapter'
import { rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stablecoin: {
    stateMutability: 'view',
    type: 'function',
    name: 'stablecoin',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
  },
  n_collaterals: {
    stateMutability: 'view',
    type: 'function',
    name: 'n_collaterals',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
  },
  collaterals: {
    stateMutability: 'view',
    type: 'function',
    name: 'collaterals',
    inputs: [
      {
        name: 'arg0',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
  },
  controllers: {
    stateMutability: 'view',
    type: 'function',
    name: 'controllers',
    inputs: [
      {
        name: 'arg0',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
  },
} as const

export async function getCRVUSDContracts(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const collateralLength = await call({ ctx, target: factory.address, abi: abi.n_collaterals })

  const [collateralsRes, controllersRes] = await Promise.all([
    multicall({
      ctx,
      calls: rangeBI(0n, collateralLength).map((idx) => ({ target: factory.address, params: [idx] } as const)),
      abi: abi.collaterals,
    }),
    multicall({
      ctx,
      calls: rangeBI(0n, collateralLength).map((idx) => ({ target: factory.address, params: [idx] } as const)),
      abi: abi.controllers,
    }),
  ])

  for (let idx = 0; idx < collateralLength; idx++) {
    const collateralRes = collateralsRes[idx]
    const controllerRes = controllersRes[idx]

    if (!collateralRes.success || !controllerRes.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: controllerRes.output,
      token: collateralRes.output,
      underlyings: [collateralRes.output],
    })
  }

  return contracts
}
