import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'cvault-finance',
  ethereum,
}

export default adapter
