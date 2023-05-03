import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'mantisswap',
  polygon,
}

export default adapter
