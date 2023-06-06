import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as moonbeam from './moonbeam'

const adapter: Adapter = {
  id: 'lido',
  ethereum,
  moonbeam,
}

export default adapter
