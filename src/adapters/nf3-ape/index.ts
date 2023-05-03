import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'nf3-ape',
  ethereum,
}

export default adapter
