import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'popsicle-finance',
  arbitrum,
  fantom,
  bsc,
  ethereum,
  polygon,
}

export default adapter
