import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  want: {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const API_URL: string = 'https://api-v2.matrix.farm/statistics/latest'

export async function getMatrixVaults(ctx: BaseContext): Promise<Contract[]> {
  const {
    tvl: { vaults },
  } = await fetch(API_URL).then((res) => res.json())

  const rawPools: Contract[] = vaults
    .filter((vault: Contract) => vault.chain === ctx.chain)
    .map(({ chain, address, provider }: Contract) => ({ chain, address, provider }))

  const lpTokens = await multicall({
    ctx,
    calls: rawPools.map(({ address }) => ({ target: address }) as const),
    abi: abi.want,
  })

  const pools: Contract[] = mapSuccessFilter(lpTokens, (res, index) => ({ ...rawPools[index], token: res.output }))
  return getPairsDetails(ctx, pools, { getAddress: (pool) => pool.token! })
}
