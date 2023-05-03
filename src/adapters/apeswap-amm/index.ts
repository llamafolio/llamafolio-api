import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'apeswap-amm',
  bsc,
  ethereum,
  polygon,
}

export default adapter
