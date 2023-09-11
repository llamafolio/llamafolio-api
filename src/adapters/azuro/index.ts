import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'
import * as gnosis from './gnosis'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'azuro',
  polygon,
  gnosis,
  arbitrum,
}

export default adapter
