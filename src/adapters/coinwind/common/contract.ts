import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pools',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accMdxPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'govAccMdxPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'accMdxShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmountLimit', type: 'uint256' },
      { internalType: 'uint256', name: 'profit', type: 'uint256' },
      { internalType: 'uint256', name: 'earnLowerlimit', type: 'uint256' },
      { internalType: 'uint256', name: 'min', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlockProfit', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'accCowPerShare', type: 'uint256' },
          { internalType: 'uint256', name: 'accCowShare', type: 'uint256' },
          { internalType: 'uint256', name: 'blockCowReward', type: 'uint256' },
          { internalType: 'uint256', name: 'blockMdxReward', type: 'uint256' },
        ],
        internalType: 'struct PoolCowInfo',
        name: 'cowInfo',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCoinWindContracts(ctx: BaseContext, masterchef: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterchef.address, params: [idx] } as const)),
    abi: abi.poolInfo,
  })

  const contracts: Contract[] = mapSuccessFilter(poolInfosRes, (res, idx: number) => ({
    chain: ctx.chain,
    address: res.output[0],
    pid: idx,
  }))

  return contracts
}
