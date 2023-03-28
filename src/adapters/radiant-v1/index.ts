import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'radiant-v1',
  arbitrum,
}

export default adapter
