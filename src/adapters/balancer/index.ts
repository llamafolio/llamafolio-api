import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'balancer',
  ethereum,
  polygon,
  arbitrum,
  gnosis,
  avalanche,
  optimism,
}

export default adapter
