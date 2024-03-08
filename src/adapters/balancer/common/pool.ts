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
  bal_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'bal_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  reward_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_count',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
} as const

const BAL: { [key: string]: `0x${string}` } = {
  arbitrum: '0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8',
  avalanche: '0xA2A035Dd93b0e963864FA14A240401d6CeAc5558',
  ethereum: '0xba100000625a3754423978a60c9317c58a424e3d',
  gnosis: '0x7ef541e2a22058048904fe5744f9c7e4c57af717',
  polygon: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
}

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
    const balancerEthGauges = await getBalancerEthGauges(ctx, gaugeController, contracts)
    return getBalancerRewards(ctx, balancerEthGauges)
  } else {
    const balancerChildGauges = await getBalancerChildGauges(ctx, contracts)
    return getBalancerRewards(ctx, balancerChildGauges)
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

  const gauges = res.pools.map((pool: any) => {
    return {
      address: pool.address.toLowerCase(),
      gauges: pool.gauges.map((gauge: any) => gauge.id),
    }
  })

  const mergedPools: Contract[] = []

  pools.forEach((pool: Contract) => {
    const poolAddressLower = pool.address.toLowerCase()
    const matchingGauge = gauges.find((gauge: any) => gauge.address === poolAddressLower)

    if (matchingGauge) {
      matchingGauge.gauges.forEach((gaugeId: string, id: number) => {
        mergedPools.push({ ...pool, gauge: gaugeId, id })
      })
    } else {
      mergedPools.push({ ...pool, gauge: undefined })
    }
  })

  return mergedPools
}

async function getBalancerRewards(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const poolsWithoutGauges = pools.filter((pool) => pool.gauge === undefined)
  const poolsWithGauges = pools.filter((pool) => pool.gauge !== undefined)

  const rewardsLengths = await multicall({
    ctx,
    calls: poolsWithGauges.map((pool) => ({ target: pool.gauge }) as const),
    abi: abi.reward_count,
  })

  const rewardsTokensCalls = rewardsLengths
    .map((res, poolIndex) => {
      return {
        pool: poolsWithGauges[poolIndex],
        calls: rangeBI(0n, res.output as bigint).map(
          (i) =>
            ({
              target: res.input.target,
              params: [i],
              poolIndex,
            }) as const,
        ),
      }
    })
    .flat()

  const rewardsTokens = await multicall({
    ctx,
    calls: rewardsTokensCalls.map((c) => c.calls).flat(),
    abi: abi.reward_tokens,
  })

  const poolWithRewards: Contract[] = poolsWithGauges.map((pool, index) => {
    const tokensForThisPool = rewardsTokens
      .filter((token) => token.input.poolIndex === index)
      .map((token) => token.output)

    return { ...pool, rewards: [BAL[ctx.chain], ...tokensForThisPool] as `0x${string}`[] }
  })

  return [...poolsWithoutGauges, ...poolWithRewards]
}
