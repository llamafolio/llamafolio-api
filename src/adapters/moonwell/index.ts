import type { Adapter } from '@lib/adapter'

import * as moonbeam from './moonbeam'
import * as base from './base'

const adapter: Adapter = {
  id: 'moonwell',
  moonbeam,
  base,
}

export default adapter
