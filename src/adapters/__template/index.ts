import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  // DefiLlama slug
  id: 'my-defillama-id',
  ethereum,
  // Optional revalidate time (in seconds)
  // Contracts returned by the adapter are cached by default and can be updated by interval with this parameter
  // This is mostly used for Factory contracts, where the number of contracts deployed varies over time
  revalidate: 60 * 60,
}

export default adapter
