import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { getMasterChefPoolsContracts, type GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  campaignInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'campaignInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
      { internalType: 'contract IERC20', name: 'rewardToken', type: 'address' },
      { internalType: 'uint256', name: 'startBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'uint256', name: 'totalRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  campaignInfoLen: {
    inputs: [],
    name: 'campaignInfoLen',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSmardexMasterChefPoolsContracts(ctx: BaseContext, masterChef: Contract): Promise<Contract[]> {
  return getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getAllPoolLength: (...args) => getAllPoolLength(...args),
    getPoolInfos: (...args) => getPoolInfos(...args),
  })
}

async function getAllPoolLength(ctx: BaseContext, masterChefAddress: `0x${string}`) {
  return call({ ctx, target: masterChefAddress, abi: abi.campaignInfoLen })
}

export async function getPoolInfos(
  ctx: BaseContext,
  { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams,
) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.campaignInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })
}
