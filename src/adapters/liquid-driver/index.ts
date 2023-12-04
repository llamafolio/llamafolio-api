import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'liquid-driver',
  fantom: fantom,
  polygon,
}

export default adapter
