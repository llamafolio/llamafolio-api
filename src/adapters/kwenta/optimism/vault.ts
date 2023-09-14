import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getAllTargets: {
    constant: true,
    inputs: [],
    name: 'getAllTargets',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  positions: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'positions',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'id', type: 'uint64' },
          { internalType: 'uint64', name: 'lastFundingIndex', type: 'uint64' },
          { internalType: 'uint128', name: 'margin', type: 'uint128' },
          { internalType: 'uint128', name: 'lastPrice', type: 'uint128' },
          { internalType: 'int128', name: 'size', type: 'int128' },
        ],
        internalType: 'struct IPerpsV2MarketBaseTypes.Position',
        name: '',
        type: 'tuple',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const sUSD: Token = {
  chain: 'optimism',
  address: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9',
  decimals: 18,
  symbol: 'sUSD',
}

export async function getContractsFromPerpsProxies(
  ctx: BaseContext,
  vaultProxies: `0x${string}`[],
): Promise<Contract[]> {
  const vaultsAddresses = await multicall({
    ctx,
    calls: vaultProxies.map((proxy) => ({ target: proxy }) as const),
    abi: abi.getAllTargets,
  })

  return mapSuccessFilter(vaultsAddresses, (response) => {
    return response.output.map((res) => ({ chain: ctx.chain, address: res, token: sUSD.address }))
  }).flat()
}
