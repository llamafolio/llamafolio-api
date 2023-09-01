import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'vesper',
  ethereum,
  optimism,
  avalanche,
  polygon,
}

export default adapter
