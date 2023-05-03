import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'solidlizard',
  arbitrum,
}

export default adapter
