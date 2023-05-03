import type { Balance } from '@lib/adapter'
import type { BigNumber } from 'ethers'

export type ProviderBalancesParams = Balance & {
  stakeAddress?: string
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: string
  provider: string
  curvePool?: string
  uniPoolAddress?: string
}
