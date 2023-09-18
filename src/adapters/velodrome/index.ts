import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism/v2'

const adapter: Adapter = {
  id: 'velodrome',
  optimism,
}

export default adapter
