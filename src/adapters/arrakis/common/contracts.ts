import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  getDeployers: {
    inputs: [],
    name: 'getDeployers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPools: {
    inputs: [
      {
        internalType: 'address',
        name: 'deployer',
        type: 'address',
      },
    ],
    name: 'getPools',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getVaults(ctx: BaseContext, factoryArrakis: Contract) {
  const poolsDeployers = await call({
    ctx,
    target: factoryArrakis.address,
    params: [],
    abi: abi.getDeployers,
  })

  const deployedPools = await multicall({
    ctx,
    calls: poolsDeployers.output.map((deployer: string) => ({
      target: factoryArrakis.address,
      params: [deployer],
    })),
    abi: abi.getPools,
  })

  const pools: Contract[] = []
  for (let idx = 0; idx < deployedPools.length; idx++) {
    const deployedPool = deployedPools[idx]
    if (!isSuccess(deployedPool)) {
      continue
    }

    for (const pool of deployedPool.output) {
      pools.push({
        chain: ctx.chain,
        address: pool,
      })
    }
  }

  return getPairsDetails(ctx, pools)
}
