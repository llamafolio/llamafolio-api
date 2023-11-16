import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'yama-finance',
  arbitrum: arbitrum,
}

export default adapter
