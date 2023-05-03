import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'pancakeswap',
  bsc,
}
/**
 *  TODO: Cake rewards autocompound on staking section
 *  docs: https://docs.pancakeswap.finance/products/syrup-pool/new-cake-pool
 */

export default adapter
