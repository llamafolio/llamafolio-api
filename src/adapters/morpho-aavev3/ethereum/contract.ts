import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

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

export async function getMarketsContractsMorphoAaveV3(ctx: BaseContext, comptroller: Contract): Promise<Contract[]> {
  return ((await call({ ctx, target: comptroller.address, abi: abi.marketsCreated })) || []).map((market) => ({
    chain: ctx.chain,
    address: market,
  }))
}
