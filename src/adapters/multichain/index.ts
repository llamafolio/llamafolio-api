import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'multichain',
  ethereum,
  bsc,
  fantom,
}

export default adapter
