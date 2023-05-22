import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'morpheus-swap',
  fantom,
}

export default adapter
