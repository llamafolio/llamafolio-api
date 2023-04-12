import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'railgun',
  ethereum,
  bsc,
  polygon,
}

export default adapter
