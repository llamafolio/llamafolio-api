import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  listPools: {
    inputs: [],
    name: 'listPools',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IERC20Metadata', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'contract ILpToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardManager: {
    inputs: [],
    name: 'rewardManager',
    outputs: [{ internalType: 'contract IRewardManager', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CNC = '0x9aE380F0272E2162340a5bB646c354271c0F5cFC'
const CRV = '0xD533a949740bb3306d119CC777fa900bA034cd52'
const CVX = '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B'

export async function getlpTokensContracts(ctx: BaseContext, controller: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const pools = await call({ ctx, target: controller.address, abi: abi.listPools })

  const calls: Call<typeof abi.lpToken>[] = pools.map((pool) => ({ target: pool }))

  const [lpTokensRes, underlyingsRes, rewardManagersRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lpToken }),
    multicall({ ctx, calls, abi: abi.underlying }),
    multicall({ ctx, calls, abi: abi.rewardManager }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const lpTokenRes = lpTokensRes[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]
    const rewardManagerRes = rewardManagersRes[poolIdx]

    if (!lpTokenRes.success || !underlyingRes.success || !rewardManagerRes.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool,
      token: lpTokenRes.output,
      lpToken: lpTokenRes.output,
      underlyings: [underlyingRes.output],
      rewarder: rewardManagerRes.output,
      rewards: [CNC, CRV, CVX],
    })
  }

  return contracts
}
