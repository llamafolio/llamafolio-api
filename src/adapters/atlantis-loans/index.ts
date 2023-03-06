import { Adapter } from '@lib/adapter'

import * as avax from './avax'
import * as bsc from './bsc'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'atlantis-loans',
  bsc,
  polygon,
  avax,
}

export default adapter
