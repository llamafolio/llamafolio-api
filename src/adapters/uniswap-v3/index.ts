import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as bsc from './bsc'
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
  base,
  bsc,
}

export default adapter
