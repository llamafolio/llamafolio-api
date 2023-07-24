import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: 'pools', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewarder: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewarder',
    outputs: [{ internalType: 'contract IRewarder', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getToken: {
    inputs: [{ internalType: 'uint8', name: 'index', type: 'uint8' }],
    name: 'getToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSynapseContracts(ctx: BaseContext, miniChef: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolLengthRes = await call({ ctx, target: miniChef.address, abi: abi.poolLength })
  const poolLength = Number(poolLengthRes)

  const calls: Call<typeof abi.lpToken>[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: miniChef.address, params: [BigInt(idx)] })
  }

  const [lpTokensRes, rewardersRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lpToken }),
    multicall({ ctx, calls, abi: abi.rewarder }),
  ])

  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const lpTokenRes = lpTokensRes[poolIdx]
    const rewarderRes = rewardersRes[poolIdx]
    const rewards = miniChef.rewards?.[0] as Contract

    if (!lpTokenRes.success || !rewarderRes.success) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: lpTokenRes.output,
      pid: poolIdx,
      pool: miniChef.pool[poolIdx],
      underlyings: [],
      rewarder: rewarderRes.output,
      rewards: [rewards],
    })
  }

  return getUnderlyingsFromSynapsePool(ctx, pools)
}

async function getUnderlyingsFromSynapsePool(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  for (const contract of contracts) {
    const pool = contract.pool
    const underlyingsTokensRes = await multicall({
      ctx,
      calls: Array.from({ length: 4 }, (_, i) => ({ target: pool, params: [i] }) as const),
      abi: abi.getToken,
    })

    underlyingsTokensRes.map((underlyingsTokenRes) => {
      if (underlyingsTokenRes.success) {
        contract.underlyings?.push(underlyingsTokenRes.output)
      }
    })
  }

  return contracts
}
