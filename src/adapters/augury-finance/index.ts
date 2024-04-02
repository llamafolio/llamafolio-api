import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'augury-finance',
  polygon: polygon,
}

export default adapter
