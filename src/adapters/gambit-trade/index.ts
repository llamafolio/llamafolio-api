import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'gambit-trade',
  arbitrum: arbitrum,
}

export default adapter
