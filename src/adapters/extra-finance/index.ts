import type { Adapter } from '@lib/adapter'

import * as base from './base'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'extra-finance',
  optimism,
  base,
}

// TODO: Find how to get Extra emission + Leveraged Farming when contracts have been verified on optimismScan

export default adapter
