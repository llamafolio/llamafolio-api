import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'spark',
  ethereum,
  gnosis,
}

export default adapter
