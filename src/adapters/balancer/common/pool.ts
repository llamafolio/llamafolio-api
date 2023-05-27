import type { BaseContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import request, { gql } from 'graphql-request'

const abi = {
  getPoolGauge: {
    inputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
    name: 'getPoolGauge',
    outputs: [{ internalType: 'contract ILiquidityGauge', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolStreamer: {
    inputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
    name: 'getPoolStreamer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBalancerPools(ctx: BaseContext, url: string, gaugeController: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const query = gql`
    query pools {
      pools(first: 1000, orderBy: totalLiquidity, orderDirection: desc, where: { totalLiquidity_gt: "100" }) {
        id
        address
        symbol
        tokens {
          decimals
          symbol
          address
        }
      }
    }
  `
  const res = await request(url, query)

  for (const pool of res.pools) {
    if (!pool.address || !pool.tokens || !pool.id) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool.address,
      id: pool.id,
      symbol: pool.symbol,
      decimals: 18,
      underlyings: pool.tokens.map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
    })
  }

  const calls: Call<typeof abi.getPoolGauge>[] = []
  for (const contract of contracts) {
    calls.push({ target: gaugeController.address, params: [contract.address] })
  }

  const [gaugesRes, rewardersRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getPoolGauge }),
    multicall({ ctx, calls, abi: abi.getPoolStreamer }),
  ])

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const gaugeRes = gaugesRes[idx]
    const rewarderRes = rewardersRes[idx]

    if (!gaugeRes.success) {
      contract.gauge = undefined
    }
    contract.gauge = gaugeRes.output

    if (!rewarderRes.success) {
      contract.rewarder = undefined
    }
    contract.rewarder = rewarderRes.output
  }
  return contracts
}
