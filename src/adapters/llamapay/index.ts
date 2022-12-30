import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'
import * as polygon from './polygon'
import * as xdai from './xdai'

const adapter: Adapter = {
  id: 'llamapay',
  arbitrum,
  avax,
  bsc,
  ethereum,
  fantom,
  optimism,
  polygon,
  xdai,
}

export default adapter
