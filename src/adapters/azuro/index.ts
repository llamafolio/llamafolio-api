import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as gnosis from './gnosis'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'azuro',
  polygon,
  gnosis,
  arbitrum,
}

export default adapter
