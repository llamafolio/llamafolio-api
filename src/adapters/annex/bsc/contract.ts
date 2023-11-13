import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getMasterChefPoolsContracts, type GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

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

export async function getAnnexContracts(ctx: BaseContext, masterchefs: Contract[]) {
  const [pools, poolsv2] = await Promise.all(
    masterchefs.map((masterChef) =>
      getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address, getPoolInfos }),
    ),
  )

  return { pools, poolsv2 }
}

async function getPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.getPoolInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })
}
