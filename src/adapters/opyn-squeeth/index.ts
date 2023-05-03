import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'opyn-squeeth',
  ethereum,
}

export default adapter
