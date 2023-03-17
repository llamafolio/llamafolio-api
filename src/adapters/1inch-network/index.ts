import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: '1inch-network',
  ethereum,
  bsc,
}

export default adapter
