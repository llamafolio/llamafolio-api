import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import request, { gql } from 'graphql-request'

const abi = {
  lenderDeployer: {
    inputs: [],
    name: 'lenderDeployer',
    outputs: [{ internalType: 'contract LenderDeployerLike', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  coordinator: {
    inputs: [],
    name: 'coordinator',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCentrifugePools(ctx: BaseContext): Promise<Contract[]> {
  const GRAPH_URL = 'https://graph.centrifuge.io/tinlake/subgraphs/name/allow-null-maturity-date'

  const query = gql`
    query pools {
      pools {
        id
      }
    }
  `
  const { pools }: any = await request(GRAPH_URL, query)

  const rawPools: Contract[] = pools.map(({ id }: any) => ({
    chain: ctx.chain,
    address: id,
  }))

  const lenderDeployersRes = await multicall({
    ctx,
    calls: rawPools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.lenderDeployer,
  })

  const coordinators = await multicall({
    ctx,
    calls: mapSuccessFilter(lenderDeployersRes, (res) => ({ target: res.output }) as const),
    abi: abi.coordinator,
  })

  return mapSuccessFilter(coordinators, (res, index) => ({
    ...rawPools[index],
    address: res.output,
    token: rawPools[index].address,
    underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
  }))
}
