import { BaseContext, Contract } from '@lib/adapter'
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
  const getPoolsDeployers = await call({
    ctx,
    target: factoryArrakis.address,
    params: [],
    abi: abi.getDeployers,
  })

  const getDeployedPools = await multicall({
    ctx,
    calls: getPoolsDeployers.output.map((deployer: string) => ({
      target: factoryArrakis.address,
      params: [deployer],
    })),
    abi: abi.getPools,
  })

  const pools: Contract[] = []
  for (let idx = 0; idx < getDeployedPools.length; idx++) {
    const getDeployedPool = getDeployedPools[idx]
    if (!isSuccess(getDeployedPool)) {
      continue
    }

    for (const pool of getDeployedPool.output) {
      pools.push({
        chain: ctx.chain,
        address: pool,
      })
    }
  }

  return getPairsDetails(ctx, pools)
}
