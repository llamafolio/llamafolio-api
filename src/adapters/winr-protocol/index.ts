import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'winr-protocol',
  arbitrum: arbitrum,
}

export default adapter
