import { Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { ethers } from 'ethers'

import FactoryAbi from '../abis/Factory.json'

export async function getVaults(factoryArrakis: Contract) {
  const provider = providers[factoryArrakis.chain]
  const contract = new ethers.Contract(factoryArrakis.address, FactoryAbi, provider)

  const allMainPools: string[] = await contract.getGelatoPools()

  const formattedPools: Contract[] = allMainPools.map((address) => ({
    name: 'pool',
    displayName: 'Arrakis Pool',
    chain: 'ethereum',
    address: address,
  }))

  const deployers: string[] = await contract.getDeployers()

  const calls = deployers.map((deployer) => ({
    params: [deployer],
    target: factoryArrakis.address,
  }))

  const getAllPoolsRes = await multicall({
    chain: 'ethereum',
    calls: calls,
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

  const getAllPools = getAllPoolsRes.filter((res) => res.success).map((res) => res.output)

  const customPoolsFetch = []
  for (let index = 0; index < getAllPools.length; index++) {
    const pools = getAllPools[index]
    for (let i = 0; i < pools.length; i++) {
      customPoolsFetch.push(pools[i])
    }
  }

  const customPools: Contract[] = customPoolsFetch.map((address) => ({
    name: 'pool',
    displayName: 'Arrakis Pool',
    chain: 'ethereum',
    address: address,
  }))

  return getPairsDetails('ethereum', formattedPools.concat(customPools))
}
