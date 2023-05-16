import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'stader',
  bsc,
  fantom,
  polygon,
}

export default adapter
