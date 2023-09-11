import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'lybra-v1',
  ethereum,
}

export default adapter
