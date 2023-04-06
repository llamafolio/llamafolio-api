import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'perennial',
  arbitrum,
}

// TODO: Perennial perpetuals on both arb + eth

export default adapter
