import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'affine-defi',
  polygon: polygon,
}

export default adapter
