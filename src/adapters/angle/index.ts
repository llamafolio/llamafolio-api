import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'angle',
  ethereum,
  arbitrum,
  optimism,
  polygon,
  avax,
}

// TODO: Altchains using API logic ?

export default adapter
