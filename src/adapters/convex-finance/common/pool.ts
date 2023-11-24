import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'rewards', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
      { internalType: 'address', name: 'factory', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3123,
  },
} as const

const CRV: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978', decimals: 18, symbol: 'CRV' },
  polygon: { chain: 'polygon', address: '0xb952a807345991bd529fdded05009f5e80fe8f45', decimals: 18, symbol: 'CVX' },
}

const CVX: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978', decimals: 18, symbol: 'CRV' },
  polygon: { chain: 'polygon', address: '0x4257ea7637c355f81616050cbb6a9b709fd72683', decimals: 18, symbol: 'CVX' },
}

export async function getConvexAltChainsPools(ctx: BaseContext, booster: Contract): Promise<Contract[]> {
  const poolLength = await getPoolLength(ctx, booster)
  return getPoolsInfo(ctx, booster, poolLength)
}

async function getPoolLength(ctx: BaseContext, booster: Contract): Promise<bigint> {
  return call({ ctx, target: booster.address, abi: abi.poolLength })
}

async function getPoolsInfo(ctx: BaseContext, booster: Contract, poolLength: bigint): Promise<Contract[]> {
  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: booster.address, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  return mapSuccessFilter(poolInfosRes, poolInfoMapper(ctx))
}

function poolInfoMapper(ctx: BaseContext): (res: any) => Contract {
  return (res) => {
    const [lpToken, gauge, rewards, _shutdown, _factory] = res.output
    return {
      chain: ctx.chain,
      address: rewards,
      token: lpToken,
      gauge,
      rewards: [CRV[ctx.chain], CVX[ctx.chain]],
      pid: res.input.params[0],
    }
  }
}
