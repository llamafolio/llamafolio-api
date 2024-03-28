import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'opx-finance',
  optimism: optimism,
}

export default adapter
