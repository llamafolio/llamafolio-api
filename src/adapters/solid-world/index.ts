import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'solid-world',
  polygon: polygon,
}

export default adapter
