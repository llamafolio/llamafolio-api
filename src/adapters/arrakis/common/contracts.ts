import { Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
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

export async function getVaults(chain: Chain, factoryArrakis: Contract) {
  const pools: Contract[] = []

  const getPoolsDeployers = await call({
    chain,
    target: factoryArrakis.address,
    params: [],
    abi: abi.getDeployers,
  })

  const getDeployedPools = await multicall({
    chain,
    calls: getPoolsDeployers.output.map((deployer: string) => ({
      target: factoryArrakis.address,
      params: [deployer],
    })),
    abi: abi.getPools,
  })

  const deployedPools = getDeployedPools.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < deployedPools.length; i++) {
    const deployedPool = deployedPools[i]

    for (const pool of deployedPool) {
      pools.push({
        name: 'pool',
        displayName: 'Arrakis Pool',
        chain,
        address: pool,
      })
    }
  }

  return getPairsDetails(chain, pools)
}
