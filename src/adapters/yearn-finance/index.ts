import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'yearn-finance',
  arbitrum,
  ethereum,
  fantom,
  optimism,
}

export default adapter
