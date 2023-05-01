import { Adapter } from '@lib/adapter'

import * as gnosis from './gnosis'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'honeyswap',
  gnosis,
  polygon,
}

export default adapter
