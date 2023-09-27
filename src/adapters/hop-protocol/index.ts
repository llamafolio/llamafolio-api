import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'hop-protocol',
  optimism: optimism,
  arbitrum: arbitrum,
  polygon: polygon,
  gnosis: gnosis,
  base: base,
}

export default adapter
