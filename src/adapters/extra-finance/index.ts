import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'extra-finance',
  optimism,
}

// TODO: Find how to get Extra emission + Leveraged Farming when contract when contracts have been verified on optimismScan

export default adapter
