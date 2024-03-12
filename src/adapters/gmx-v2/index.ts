import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'gmx-v2',
  avalanche: avalanche,
  arbitrum: arbitrum,
}

// TODO: Perps logic

export default adapter
