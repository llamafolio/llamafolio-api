import type { BaseContext, Contract } from '@lib/adapter'
import { groupBy, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  SY: {
    inputs: [],
    name: 'SY',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  readTokens: {
    inputs: [],
    name: 'readTokens',
    outputs: [
      { internalType: 'contract IStandardizedYield', name: '_SY', type: 'address' },
      { internalType: 'contract IPPrincipalToken', name: '_PT', type: 'address' },
      { internalType: 'contract IPYieldToken', name: '_YT', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  assetInfo: {
    inputs: [],
    name: 'assetInfo',
    outputs: [
      { internalType: 'enum IStandardizedYield.AssetType', name: 'assetType', type: 'uint8' },
      { internalType: 'address', name: 'assetAddress', type: 'address' },
      { internalType: 'uint8', name: 'assetDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  yieldToken: {
    inputs: [],
    name: 'yieldToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const chainId: { [key: string]: number } = {
  ethereum: 1,
  arbitrum: 42161,
  avalanche: 43114,
  optimism: 10,
  bsc: 56,
}

export async function getPendlePools(ctx: BaseContext): Promise<Contract[]> {
  const API_URL = `https://api-v2.pendle.finance/core/v1/${chainId[ctx.chain]}/assets/all`
  const EXCLUDED_BASE_TYPES = ['GENERIC', 'IB', 'NATIVE']
  const pools: Contract[] = []

  const rawPools: any[] = await fetch(API_URL).then((res) => res.json())

  const transformedPools = rawPools.map((data) => transformData(ctx, data))
  const filteredTransformedPools = transformedPools.filter((pool) => !EXCLUDED_BASE_TYPES.includes(pool.baseType))

  const SY_addressesRes = await multicall({
    ctx,
    calls: filteredTransformedPools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.SY,
  })

  for (const [index, pool] of filteredTransformedPools.entries()) {
    const SY_address = SY_addressesRes[index].success ? SY_addressesRes[index].output : pool.address
    pools.push({ ...pool, SY: SY_address })
  }

  const { PT, YT, SY, PENDLE_LP } = groupBy(pools, 'baseType')
  return [...(await getPendle_LPUnderlyings(ctx, PENDLE_LP)), ...PT, ...YT, ...SY]
}

function transformData(ctx: BaseContext, data: any) {
  const { baseType, address, symbol, decimals, protocol } = data
  return { chain: ctx.chain, address, symbol, decimals, protocol, baseType }
}

async function getPendle_LPUnderlyings(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const tokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.readTokens,
  })

  return mapSuccessFilter(tokensRes, (res, index) => {
    const [SY, PT, _] = res.output
    return { ...pools[index], SY: SY, underlyings: [SY, PT] }
  })
}
