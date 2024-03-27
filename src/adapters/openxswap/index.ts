import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'openxswap',
  optimism: optimism,
}

export default adapter
