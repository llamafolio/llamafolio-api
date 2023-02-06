import { BaseContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
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
}

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
      underlyings: pool.tokens
        // sometimes the tokens returned have the lpToken of the pool in order to facilitate the balance function, but in our case it acts as a duplicate
        .filter((underlying: Contract) => underlying.address !== pool.address)
        .map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
    })
  }

  const calls: Call[] = []
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

    if (!isSuccess(gaugeRes) || !isSuccess(rewarderRes)) {
      contract.gauge = undefined
      continue
    }

    contract.gauge = gaugeRes.output
    contract.rewarder = rewarderRes.output
  }

  return contracts
}
