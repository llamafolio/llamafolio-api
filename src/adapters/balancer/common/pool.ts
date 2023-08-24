import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
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
  n_gauges: {
    stateMutability: 'view',
    type: 'function',
    name: 'n_gauges',
    inputs: [],
    outputs: [{ name: '', type: 'int128' }],
  },
  gauges: {
    stateMutability: 'view',
    type: 'function',
    name: 'gauges',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'lp_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
} as const

export async function getBalancerPools(ctx: BaseContext, url: string, gaugeController?: Contract): Promise<Contract[]> {
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
  const res: any = await request(url, query)

  for (const pool of res.pools) {
    if (!pool.address || !pool.tokens || !pool.id) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool.address,
      poolId: pool.id,
      symbol: pool.symbol,
      decimals: 18,
      underlyings: pool.tokens.map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
    })
  }

  if (ctx.chain === 'ethereum' && gaugeController) {
    return getBalancerEthGauges(ctx, gaugeController, contracts)
  } else {
    return getBalancerChildGauges(ctx, contracts)
  }
}

async function getBalancerEthGauges(
  ctx: BaseContext,
  gaugeController: Contract,
  pools: Contract[],
): Promise<Contract[]> {
  const nGaugesRes = await call({ ctx, target: gaugeController.address, abi: abi.n_gauges })

  const gaugesRes = await multicall({
    ctx,
    calls: rangeBI(0n, nGaugesRes).map((i) => ({ target: gaugeController.address, params: [i] }) as const),
    abi: abi.gauges,
  })

  const lpTokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(gaugesRes, (res) => ({ target: res.output }) as const),
    abi: abi.lp_token,
  })

  const lpTokens = mapSuccessFilter(lpTokensRes, (res) => ({ gauge: res.input.target, lpToken: res.output }))

  const mergedPools: any[] = pools.map((pool) => {
    const poolAddressLower = pool.address.toLowerCase()
    const matchingLpToken = lpTokens.find((lpToken) => lpToken.lpToken.toLowerCase() === poolAddressLower)

    if (matchingLpToken) {
      return { ...pool, gauge: matchingLpToken.gauge }
    } else {
      return { ...pool, gauge: undefined }
    }
  })

  return mergedPools
}

async function getBalancerChildGauges(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const gauges: any = []

  const fmtCtx = ctx.chain === 'gnosis' ? 'gnosis-chain' : ctx.chain

  const URL = `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-${fmtCtx}`

  const query = gql`
    query pools {
      pools {
        address
        gauges {
          id
        }
      }
    }
  `
  const res: any = await request(URL, query)

  for (const pool of res.pools) {
    if (!pool.address || !pool.gauges) {
      continue
    }

    gauges.push({ address: pool.address, gauges: pool.gauges })
  }

  const mergedPools: any[] = pools.map((pool) => {
    const poolAddressLower = pool.address.toLowerCase()
    const matchingLpToken = gauges.find((gauge: any) => gauge.address.toLowerCase() === poolAddressLower)

    if (matchingLpToken) {
      return { ...pool, gauge: matchingLpToken.gauges.map((gauge: any) => gauge.id) }
    } else {
      return { ...pool, gauge: undefined }
    }
  })

  return mergedPools
}
