import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'sushiswap',
  ethereum,
  polygon,
  arbitrum,
  fantom,
  avax,
  bsc,
}

export default adapter
