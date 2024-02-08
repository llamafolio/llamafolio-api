import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'virtuswap',
  polygon: polygon,
}

export default adapter
