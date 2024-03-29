import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'beethoven-x',
  optimism: optimism,
  fantom: fantom,
}

export default adapter
