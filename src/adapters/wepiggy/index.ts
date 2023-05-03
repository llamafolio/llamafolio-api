import * as arbitrum from '@adapters/wepiggy/arbitrum'
import * as bsc from '@adapters/wepiggy/bsc'
import * as ethereum from '@adapters/wepiggy/ethereum'
// import * as optimism from '@adapters/wepiggy/optimism'
import * as polygon from '@adapters/wepiggy/polygon'
import type { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'wepiggy',
  arbitrum,
  bsc,
  ethereum,
  // optimism,
  polygon,
}

export default adapter
