import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'
import * as fantom from './fantom'
import * as ethereum from './ethereum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'tetu',
  polygon,
  fantom,
  ethereum,
  bsc,
}

export default adapter
