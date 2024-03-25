import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'purple-bridge-dex',
  polygon: polygon,
}

export default adapter
