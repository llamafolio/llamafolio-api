import type { BaseContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  getBassets: {
    inputs: [],
    name: 'getBassets',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'addr', type: 'address' },
          { internalType: 'address', name: 'integrator', type: 'address' },
          { internalType: 'bool', name: 'hasTxFee', type: 'bool' },
          { internalType: 'enum MassetStructs.BassetStatus', name: 'status', type: 'uint8' },
        ],
        internalType: 'struct MassetStructs.BassetPersonal[]',
        name: 'personal',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint128', name: 'ratio', type: 'uint128' },
          { internalType: 'uint128', name: 'vaultBalance', type: 'uint128' },
        ],
        internalType: 'struct MassetStructs.BassetData[]',
        name: 'data',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getmStableLPContracts(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address }))

  const [underlyingsAssetsRes, underlyingsTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.underlying }),
    multicall({ ctx, calls, abi: abi.getBassets }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingAssetRes = underlyingsAssetsRes[poolIdx]
    const underlyingTokenRes = underlyingsTokensRes[poolIdx]

    const underlyings: string[] = isSuccess(underlyingAssetRes)
      ? [underlyingAssetRes.output]
      : underlyingTokenRes.output.personal.map((res: any) => res.addr)

    contracts.push({ ...pool, underlyings })
  }

  return contracts
}
