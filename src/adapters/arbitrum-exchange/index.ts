import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'arbitrum-exchange',
  arbitrum,
}

export default adapter
