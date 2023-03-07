import { Balance } from '@lib/adapter'
import { BigNumber } from 'ethers'

export interface ProviderBalancesParams extends Balance {
  stakeAddress?: string
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: string
  provider: string
  curvePool?: string
  uniPoolAddress?: string
}
