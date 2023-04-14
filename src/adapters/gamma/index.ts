import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as celo from './celo'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'gamma',
  polygon,
  optimism,
  arbitrum,
  ethereum,
  bsc,
  celo,
}

// TODO: Find logic behind rewards
// https://docs.gamma.xyz/gamma/learn/scans

export default adapter
