import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'tornado-cash',
  ethereum,
}

export default adapter
