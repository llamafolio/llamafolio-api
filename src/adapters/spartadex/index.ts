import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'spartadex',
  arbitrum: arbitrum,
}

// TODO: Find vest and farming contracts

export default adapter
