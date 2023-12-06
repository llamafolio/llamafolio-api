import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'proxy',
  polygon: polygon,
}

export default adapter
