import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'alchemix',
  ethereum,
  optimism,
  fantom,
}

export default adapter
