import { Adapter } from '@lib/adapter'

import * as avax from './avax'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'atlas-usv',
  avax,
  bsc,
  ethereum,
  polygon,
}

export default adapter
