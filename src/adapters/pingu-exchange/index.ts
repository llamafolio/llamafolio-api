import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'pingu-exchange',
  arbitrum: arbitrum,
}

export default adapter
