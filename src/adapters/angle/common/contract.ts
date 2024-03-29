import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  staking_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'staking_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 3078,
  },
  token0: {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const API_URL = 'https://api.angle.money/v1/pools'

export async function getStablePoolContractsFromAPI(ctx: BaseContext, chainId: number): Promise<Contract[]> {
  const response = await fetch(`${API_URL}?chainId=${chainId}`)
  const data = await response.json()

  return Object.values(data).map((d: any) => ({
    chain: ctx.chain,
    address: d.sanTokenAddress,
    underlyings: [d.collateralAddress],
    gauge: d.liquidityGaugeAddress,
    rewards: ['0x31429d1856aD1377A8A0079410B297e1a9e214c2'],
  }))
}

export async function getAnglePoolsContract(
  ctx: BaseContext,
  swapPools: `0x${string}`[],
  gelatoPools: `0x${string}`[],
): Promise<Contract[]> {
  const contracts: Contract[] = []
  const pools: Contract[] = []

  for (const poolsAddress of swapPools) {
    pools.push({ chain: ctx.chain, address: poolsAddress, type: 'swap' })
  }
  for (const poolsAddress of gelatoPools) {
    pools.push({ chain: ctx.chain, address: poolsAddress, type: 'gelato' })
  }

  const lpTokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.staking_token,
  })

  const calls = mapSuccess(lpTokensRes, (res) => ({ target: res.output }))

  const [underlyingsTokens0Res, underlyingsTokens1Res] = await Promise.all([
    multicall({ ctx, calls, abi: abi.token0 }),
    multicall({ ctx, calls, abi: abi.token1 }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const lpTokenRes = lpTokensRes[poolIdx]
    const underlyingsToken0Res = underlyingsTokens0Res[poolIdx]
    const underlyingsToken1Res = underlyingsTokens1Res[poolIdx]

    if (!lpTokenRes.success || !underlyingsToken0Res.success || !underlyingsToken1Res.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool.address,
      gaugeType: pool.type,
      lpToken: lpTokenRes.output,
      underlyings: [underlyingsToken0Res.output, underlyingsToken1Res.output],
      rewards: ['0x31429d1856aD1377A8A0079410B297e1a9e214c2'],
    })
  }

  return contracts
}
