import { Balance } from '@lib/adapter'
import { BigNumber } from 'ethers'

export interface ProviderBalancesParams extends Balance {
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: string
  provider: string
  curvePool?: string
  uniPoolAddress?: string
}
