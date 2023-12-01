import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'rubicon',
  optimism: optimism,
}

export default adapter
