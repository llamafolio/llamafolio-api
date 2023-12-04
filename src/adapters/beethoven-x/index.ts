import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'beethoven-x',
  optimism: optimism,
  fantom: fantom,
}

export default adapter
