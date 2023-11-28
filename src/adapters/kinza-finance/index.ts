import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as opbnb from './opbnb'

const adapter: Adapter = {
  id: 'kinza-finance',
  bsc: bsc,
  opbnb: opbnb,
}

export default adapter
