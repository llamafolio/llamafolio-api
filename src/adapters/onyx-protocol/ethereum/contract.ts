import type { BaseContext, Contract } from '@lib/adapter'
import { rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

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
      { internalType: 'contract IERC20', name: 'stakeToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accCHNPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmountStake', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const Onyx: Token = {
  chain: 'ethereum',
  address: '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18',
  decimals: 18,
  symbol: 'XCN',
}

export async function getOnyxPoolsContracts(ctx: BaseContext, lendingPool: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolLengthBI = await call({ ctx, target: lendingPool.address, abi: abi.poolLength })
  const poolLength = Number(poolLengthBI)

  const poolsInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLengthBI).map((idx) => ({ target: lendingPool.address, params: [idx] } as const)),
    abi: abi.poolInfo,
  })

  for (let idx = 0; idx < poolLength; idx++) {
    const poolsInfo = poolsInfos[idx]

    if (!poolsInfo.success) {
      continue
    }

    const [stakeToken] = poolsInfo.output

    contracts.push({
      chain: ctx.chain,
      address: stakeToken,
      underlyings: undefined,
      reward: [Onyx],
      pid: idx,
    })
  }

  return contracts
}
