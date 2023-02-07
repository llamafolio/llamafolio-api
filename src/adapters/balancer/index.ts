import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'balancer',
  ethereum,
  polygon,
  arbitrum,
}

export default adapter
