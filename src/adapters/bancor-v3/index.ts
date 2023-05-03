import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'bancor-v3',
  ethereum,
}

export default adapter
