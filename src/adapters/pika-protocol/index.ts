import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'pika-protocol',
  optimism,
}

export default adapter
