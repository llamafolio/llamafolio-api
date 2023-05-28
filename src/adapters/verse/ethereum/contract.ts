import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  stakeToken: {
    inputs: [],
    name: 'stakeToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getVerseContracts(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const tokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.stakeToken,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const tokenRes = tokensRes[poolIdx]

    if (!tokenRes.success) {
      continue
    }

    contracts.push({ ...pool, address: tokenRes.output, pool: pool.address, lpToken: tokenRes.output })
  }

  return getPairsDetails(ctx, contracts)
}
