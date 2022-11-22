import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'

const adapter: Adapter = {
  id: 'gmx',
  arbitrum,
  avax,
}

export default adapter
