import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
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
  seniorTranche: {
    inputs: [],
    name: 'seniorTranche',
    outputs: [{ internalType: 'contract TrancheLike', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  juniorTranche: {
    inputs: [],
    name: 'juniorTranche',
    outputs: [{ internalType: 'contract TrancheLike', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract ERC20Like', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenSupply: {
    inputs: [],
    name: 'tokenSupply',
    outputs: [{ internalType: 'uint256', name: 'totalSupply_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCentrifugePools(ctx: BaseContext): Promise<Contract[]> {
  const GRAPH_URL = 'https://api.goldsky.com/api/public/project_clhi43ef5g4rw49zwftsvd2ks/subgraphs/main/prod/gn'

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
    underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
  }))

  const lenderDeployersRes = await multicall({
    ctx,
    calls: rawPools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.lenderDeployer,
  })

  const coordinatorsRes = await multicall({
    ctx,
    calls: mapSuccessFilter(lenderDeployersRes, (res) => ({ target: res.output }) as const),
    abi: abi.coordinator,
  })

  const coordinators: Contract[] = mapSuccessFilter(coordinatorsRes, (res, index) => ({
    ...rawPools[index],
    coordinator: res.output,
  }))

  const [seniorTrancheAddresses, juniorTrancheAddresses] = await Promise.all([
    multicall({
      ctx,
      calls: coordinators.map(({ coordinator }) => ({ target: coordinator }) as const),
      abi: abi.seniorTranche,
    }),
    multicall({
      ctx,
      calls: coordinators.map(({ coordinator }) => ({ target: coordinator }) as const),
      abi: abi.juniorTranche,
    }),
  ])

  const [seniorTokens, juniorTokens] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(seniorTrancheAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.token,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(juniorTrancheAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.token,
    }),
  ])

  return mapMultiSuccessFilter(
    seniorTokens.map((_, i) => [seniorTokens[i], juniorTokens[i]]),

    (res) => {
      const [seniorToken, juniorToken] = res.inputOutputPairs

      const seniorPool = {
        chain: ctx.chain,
        address: seniorToken.input.target,
        token: seniorToken.output,
        underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
      }

      const juniorPool = {
        chain: ctx.chain,
        address: juniorToken.input.target,
        token: juniorToken.output,
        underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
      }

      return [seniorPool, juniorPool]
    },
  ).flat()
}
