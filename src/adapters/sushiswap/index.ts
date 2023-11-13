import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as gnosis from './gnosis'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'sushiswap',
  ethereum,
  polygon,
  arbitrum,
  fantom,
  avalanche,
  bsc,
  gnosis,
}

export default adapter
