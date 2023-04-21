import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'timewarp',
  bsc,
  ethereum,
}

export default adapter
