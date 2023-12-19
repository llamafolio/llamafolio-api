import type { BaseContext, Contract } from '@lib/adapter'

const MAGIC: Contract = {
  chain: 'arbitrum',
  address: '0x539bde0d7dbd336b79148aa742883198bbf60342',
  decimals: 18,
  symbol: 'MAGIC',
}

export async function getTreasurePools(ctx: BaseContext, pools: `0x${string}`[]): Promise<Contract[]> {
  return pools.map((pool) => ({ chain: ctx.chain, address: pool, token: MAGIC.address, rewards: [MAGIC] }))
}
