import { Adapter } from '@lib/adapter'

import * as avax from './avax'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'granary-finance',
  avax,
  ethereum,
  fantom,
  optimism,
}

export default adapter
