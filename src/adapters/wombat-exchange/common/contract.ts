import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export async function getWombatPoolsContracts(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const tokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.getTokens })

  const addressOfAssetsRes = await multicall({
    ctx,
    calls: tokensRes.flatMap((token) =>
      isSuccess(token) ? token.output.map((t: string) => ({ target: token.input.target, params: [t] })) : null,
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
