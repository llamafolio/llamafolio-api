import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as polygon from './polygon'
import * as arbitrum from './arbitrum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'davos-protocol',
  ethereum: ethereum,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
}

export default adapter
