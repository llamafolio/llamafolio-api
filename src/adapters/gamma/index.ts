import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bsc from './bsc'
import * as celo from './celo'
import * as ethereum from './ethereum'
import * as moonbeam from './moonbeam'
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
  base,
  avalanche,
  moonbeam,
}

// TODO: Find logic behind rewards
// https://docs.gamma.xyz/gamma/learn/scans

export default adapter
