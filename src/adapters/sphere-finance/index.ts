import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'sphere-finance',
  polygon,
}

export default adapter
