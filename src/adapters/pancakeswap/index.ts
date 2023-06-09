import type { Adapter } from '@lib/adapter'

import * as bsc from './legacy/bsc'
import * as ethereum from './legacy/ethereum'

const adapter: Adapter = {
  id: 'pancakeswap',
  bsc,
  ethereum,
}
/**
 *  TODO: Cake rewards autocompound on staking section
 *  docs: https://docs.pancakeswap.finance/products/syrup-pool/new-cake-pool
 */

export default adapter
