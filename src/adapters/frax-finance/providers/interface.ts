import type { Balance } from '@lib/adapter'
import type { BigNumber } from 'ethers'

export type ProviderBalancesParams = Balance & {
  stakeAddress?: `0x${string}`
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: `0x{string}`
  provider: string
  curvePool?: `0x${string}`
  uniPoolAddress?: `0x${string}`
}
