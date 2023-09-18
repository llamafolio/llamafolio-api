import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'velodrome-v2',
  optimism: optimism,
}

export default adapter
