import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'lodestar-finance',
  arbitrum,
}

export default adapter
