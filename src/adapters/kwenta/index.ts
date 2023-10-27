import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'kwenta',
  optimism: optimism,
}

// TODO: Find a way to get perpetuals & futures

export default adapter
