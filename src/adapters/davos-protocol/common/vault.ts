import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  interaction: {
    inputs: [],
    name: 'interaction',
    outputs: [{ internalType: 'contract IInteraction', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  collateral: {
    inputs: [],
    name: 'collateral',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IWrapped', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDavosVaults(ctx: BaseContext, vaultAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [vaultInteractions, vaultTokens, vaultUnderlyings] = await Promise.all([
    multicall({ ctx, calls: vaultAddresses.map((address) => ({ target: address }) as const), abi: abi.interaction }),
    multicall({ ctx, calls: vaultAddresses.map((address) => ({ target: address }) as const), abi: abi.collateral }),
    multicall({ ctx, calls: vaultAddresses.map((address) => ({ target: address }) as const), abi: abi.underlying }),
  ])

  return mapMultiSuccessFilter(
    vaultTokens.map((_, i) => [vaultInteractions[i], vaultTokens[i], vaultUnderlyings[i]]),

    (res, index) => {
      const router = vaultAddresses[index]
      const [{ output: address }, { output: token }, { output: underlying }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        token,
        router,
        underlyings: [underlying],
      }
    },
  )
}
