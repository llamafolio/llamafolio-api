import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { GetUnderlyingsParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  stakingToken: {
    constant: true,
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSwapBasedAllPoolLength(_ctx: BaseContext, _masterChefAddress: `0x${string}`) {
  return 20n
}

export async function getSwapBasedUnderlyings(ctx: BaseContext, { pools }: GetUnderlyingsParams): Promise<Contract[]> {
  const stakingTokens = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.stakingToken,
  })

  return getPairsDetails(
    ctx,
    mapSuccessFilter(stakingTokens, (res, index) => ({ ...pools[index], token: res.output })),
    { getAddress: (contract) => contract.token! },
  )
}
