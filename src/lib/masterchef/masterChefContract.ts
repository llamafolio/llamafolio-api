import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

export const MASTERCHEF_ABI = {
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
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface GetPoolsContractsProps {
  masterChefAddress: `0x${string}`
  registry?: Contract
  getAllPoolLength?: (ctx: BaseContext, masterchefAddress: `0x${string}`) => Promise<any>
  getPoolInfos?: (ctx: BaseContext, params: GetPoolsInfosParams) => Promise<any>
  getLpToken?: (params: GetLpTokenParams) => any
  getUnderlyings?: (ctx: BaseContext, params: GetUnderlyingsParams) => Promise<any>
}

export interface GetPoolsInfosParams {
  masterChefAddress: `0x${string}`
  poolLength: bigint
  getLpToken?: (params: GetLpTokenParams) => Promise<any>
}

export interface GetUnderlyingsParams {
  pools: Contract[]
}

export interface GetLpTokenParams {
  lpToken: any
}

export async function getMasterChefPoolsContracts(
  ctx: BaseContext,
  options: GetPoolsContractsProps,
): Promise<Contract[]> {
  const _getAllPoolLength = options.getAllPoolLength || getAllPoolLength
  const _getPoolInfos = options.getPoolInfos || getPoolInfos
  const _getLpToken = options.getLpToken || getLpToken
  const _getUnderlyings = options.getUnderlyings || getUnderlyings

  const poolLength = await _getAllPoolLength(ctx, options.masterChefAddress)
  const pools = await _getPoolInfos(ctx, {
    masterChefAddress: options.masterChefAddress,
    poolLength,
    getLpToken: _getLpToken,
  })

  return _getUnderlyings(ctx, { pools })
}

export async function getAllPoolLength(ctx: BaseContext, masterChefAddress: `0x${string}`) {
  return call({ ctx, target: masterChefAddress, abi: MASTERCHEF_ABI.poolLength })
}

export async function getPoolInfos(
  ctx: BaseContext,
  { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams,
) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: MASTERCHEF_ABI.poolInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })
}

function getLpToken({ lpToken }: GetLpTokenParams) {
  return lpToken[0]
}

async function getUnderlyings(ctx: BaseContext, { pools }: GetUnderlyingsParams): Promise<Contract[]> {
  return getPairsDetails(ctx, pools)
}
