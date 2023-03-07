import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as arbitrum from './arbitrum'
import * as polygon from './polygon'
import * as optimism from './optimism'
import * as celo from './celo'

const adapter: Adapter = {
  id: 'uniswap-v3',
  ethereum,
  arbitrum,
  polygon,
  optimism,
  celo,
}

export default adapter
