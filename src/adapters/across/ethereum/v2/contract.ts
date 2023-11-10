import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  pooledTokens: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pooledTokens',
    outputs: [
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'bool', name: 'isEnabled', type: 'bool' },
      { internalType: 'uint32', name: 'lastLpFeeUpdate', type: 'uint32' },
      { internalType: 'int256', name: 'utilizedReserves', type: 'int256' },
      { internalType: 'uint256', name: 'liquidReserves', type: 'uint256' },
      { internalType: 'uint256', name: 'undistributedLpFees', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const chainId: { [key: string]: number } = {
  ethereum: 1,
  optimism: 10,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
}

export async function getAcrossV2Contracts(ctx: BaseContext, manager: Contract): Promise<Contract[]> {
  const API_URL = 'https://across.to/api/available-routes'

  const response = await fetch(API_URL).then((res) => res.json())

  const uniqueAddresses = new Set()
  const uniqueDatas = response.reduce((acc: Contract[], res: any) => {
    if (res.originChainId === chainId[ctx.chain] && !uniqueAddresses.has(res.originToken)) {
      uniqueAddresses.add(res.originToken)
      acc.push({ chain: ctx.chain, address: res.originToken })
    }
    return acc
  }, [])

  return getPoolAccross(ctx, uniqueDatas, manager)
}

async function getPoolAccross(ctx: BaseContext, pools: Contract[], manager: Contract): Promise<Contract[]> {
  const pooledTokens = await multicall({
    ctx,
    calls: pools.map(({ address }) => ({ target: manager.address, params: [address] }) as const),
    abi: abi.pooledTokens,
  })

  return mapSuccessFilter(pooledTokens, (res, index) => ({
    ...pools[index],
    address: res.output[0],
    underlyings: [res.input.params[0]],
  }))
}
