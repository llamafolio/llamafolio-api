import type { BaseContext, Contract } from '@lib/adapter'
import { flatMapSuccess, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getTokens: {
    inputs: [],
    name: 'getTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  addressOfAsset: {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'addressOfAsset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getWombatPoolsContracts(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const tokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.getTokens })

  const addressOfAssetsRes = await multicall({
    ctx,
    calls: flatMapSuccess(tokensRes, (token) =>
      token.output.map((tokenAddress) => ({ target: token.input.target, params: [tokenAddress] }) as const),
    ),
    abi: abi.addressOfAsset,
  })

  const contracts: Contract[] = mapSuccessFilter(addressOfAssetsRes, (res) => {
    const { input, output } = res

    return {
      chain: ctx.chain,
      address: output,
      underlyings: input.params,
      provider: input.target,
    }
  })

  return contracts
}
