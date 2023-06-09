import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'pancakeswap-amm-v3',
  bsc,
  ethereum,
}

export default adapter
