import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getAllMarkets: {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'address[]', name: 'marketsCreated', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyings_assets: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  marketsCreated: {
    inputs: [],
    name: 'marketsCreated',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMarketsContracts(ctx: BaseContext, lens: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const marketsContractsRes = await call({
    ctx,
    target: lens.address,
    abi: abi.getAllMarkets,
  })

  const underlyingsRes = await multicall({
    ctx,
    calls: marketsContractsRes.map((token) => ({ target: token })),
    abi: abi.underlyings_assets,
  })

  for (let idx = 0; idx < underlyingsRes.length; idx++) {
    const market = marketsContractsRes[idx]
    const underlying = underlyingsRes[idx]

    if (!underlying.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: market,
      underlyings: [underlying.output],
    })
  }

  return contracts
}
