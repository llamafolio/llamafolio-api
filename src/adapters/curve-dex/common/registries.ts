import type { BaseContext } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  get_address: {
    name: 'get_address',
    outputs: [
      {
        type: 'address',
        name: '',
      },
    ],
    inputs: [
      {
        type: 'uint256',
        name: '_id',
      },
    ],
    stateMutability: 'view',
    type: 'function',
    gas: 1308,
  },
}

export type Registry = 'stableSwap' | 'stableFactory' | 'cryptoSwap' | 'cryptoFactory'

export const Registries: { [key in Registry]: number } = {
  stableSwap: 0,
  stableFactory: 3,
  cryptoSwap: 5,
  cryptoFactory: 6,
}

export const getRegistries = async (ctx: BaseContext, registries: Registry[]) => {
  const res: Partial<Record<Registry, `0x${string}`>> = {}

  const registriesAddressRes = await multicall({
    ctx,
    calls: registries.map((id) => ({
      params: [Registries[id]],
      // Immutable address provider (same address on all chains)
      target: '0x0000000022d53366457f9d5e68ec105046fc4383',
    })),
    abi: abi.get_address,
  })

  // fail in case of error, no need to continue the process if we're missing a registry
  if (registriesAddressRes.some((res) => !res.success)) {
    throw new Error('Failed to get registries')
  }

  for (let i = 0; i < registries.length; i++) {
    res[registries[i]] = registriesAddressRes[i].output
  }

  return res
}
