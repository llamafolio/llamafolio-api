import { Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

export async function getVaults(chain: Chain, factoryArrakis: Contract) {
  const pools: Contract[] = []

  const getPoolsDeployers = await call({
    chain,
    target: factoryArrakis.address,
    params: [],
    abi: {
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
  })

  const getDeployedPools = await multicall({
    chain,
    calls: getPoolsDeployers.output.map((deployer: string) => ({
      target: factoryArrakis.address,
      params: [deployer],
    })),
    abi: {
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
  })

  const deployedPools = getDeployedPools.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < deployedPools.length; i++) {
    const deployedPool = deployedPools[i]

    deployedPool.map((pool: string) => {
      pools.push({
        name: 'pool',
        displayName: 'Arrakis Pool',
        chain,
        address: pool,
      })
    })
  }

  return getPairsDetails(chain, pools)
}
