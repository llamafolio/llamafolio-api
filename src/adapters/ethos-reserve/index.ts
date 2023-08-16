import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'ethos-reserve',
  optimism,
}

export default adapter
