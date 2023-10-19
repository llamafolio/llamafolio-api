import type { BaseContext, Contract } from '@lib/adapter'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

export async function getGoodEntryContracts(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const pools = poolsAddresses.map((address) => ({ chain: ctx.chain, address }))

  return getPairsDetails(ctx, pools)
}
