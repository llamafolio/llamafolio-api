import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
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
  const tokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.stakeToken,
  })

  const contracts: Contract[] = mapSuccessFilter(tokensRes, (res) => ({
    chain: ctx.chain,
    address: res.output,
    pool: res.input.target,
    token: res.output,
    lpToken: res.output,
  }))

  return (await getPairsDetails(ctx, contracts)).map((contract) => ({ ...contract, address: contract.pool }))
}
