import type { Balance } from '@lib/adapter'

export type ProviderBalancesParams = Balance & {
  stakeAddress?: `0x${string}`
  amount: bigint
  totalSupply: bigint
  lpToken: `0x{string}`
  provider: string
  curvePool?: `0x${string}`
  uniPoolAddress?: `0x${string}`
}
