import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'shell-protocol',
  arbitrum: arbitrum,
}

export default adapter
