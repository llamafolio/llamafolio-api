import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'morphex',
  fantom,
}

// TODO: Perpetuals logic

export default adapter
