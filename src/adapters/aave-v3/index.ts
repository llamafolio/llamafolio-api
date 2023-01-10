import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'aave-v3',
  arbitrum,
  avax,
  fantom,
  polygon,
}

export default adapter
