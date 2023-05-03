import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as celo from './celo'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'uniswap-v3',
  ethereum,
  arbitrum,
  polygon,
  optimism,
  celo,
}

export default adapter
