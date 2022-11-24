import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'radiant',
  arbitrum,
}

export default adapter
