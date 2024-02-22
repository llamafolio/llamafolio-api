import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  collateral: {
    inputs: [],
    name: 'collateral',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  mai: {
    inputs: [],
    name: 'mai',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getQidaoVaults(ctx: BaseContext, vaultsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [collaterals, debts] = await Promise.all([
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.collateral }),
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.mai }),
  ])

  return mapMultiSuccessFilter(
    collaterals.map((_, i) => [collaterals[i], debts[i]]),

    (res, index) => {
      const vaultAddress = vaultsAddresses[index]
      const [{ output: collateral }, { output: debt }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: vaultAddress,
        underlyings: [collateral, debt],
      }
    },
  )
}
