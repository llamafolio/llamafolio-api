import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'geist-finance',
  fantom,
}

export default adapter
