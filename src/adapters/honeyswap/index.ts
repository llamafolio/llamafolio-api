import { Adapter } from '@lib/adapter'

import * as polygon from './polygon'
import * as xdai from './xdai'

const adapter: Adapter = {
  id: 'honeyswap',
  polygon,
  xdai,
}

export default adapter
