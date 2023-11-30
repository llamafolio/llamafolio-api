import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'ondo-finance',
  ethereum,
  polygon,
}

export default adapter
