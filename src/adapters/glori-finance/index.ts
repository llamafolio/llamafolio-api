import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'glori-finance',
  arbitrum: arbitrum,
}

export default adapter
