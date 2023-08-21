import type { Adapter } from '@lib/adapter'

import * as base from './base'
import * as moonbeam from './moonbeam'

const adapter: Adapter = {
  id: 'moonwell',
  moonbeam,
  base,
}

export default adapter
