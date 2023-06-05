import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolInfo: {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'getPoolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'lpSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accAnnexperShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAnnexContracts(ctx: BaseContext, masterchefs: Contract[]): Promise<Contract[]> {
  const poolLength = await multicall({
    ctx,
    calls: masterchefs.map((master) => ({ target: master.address })),
    abi: abi.poolLength,
  })

  const poolInfosRes = await multicall({
    ctx,
    calls: poolLength.map((pool, idx) => ({ target: pool.input.target, params: [BigInt(idx)] } as const)),
    abi: abi.getPoolInfo,
  })

  const contracts: Contract[] = mapSuccessFilter(poolInfosRes, (res, idx) => ({
    chain: ctx.chain,
    address: res.output[0],
    lpToken: res.output[0],
    masterchef: res.input.target,
    pid: idx,
  }))

  return getPairsDetails(ctx, contracts)
}
