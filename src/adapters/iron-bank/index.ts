import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'iron-bank',
  avalanche,
  ethereum,
  fantom,
  optimism,
}

export default adapter
