import * as arbitrum from '@adapters/curve-dex/arbitrum'
import * as avalanche from '@adapters/curve-dex/avalanche'
import * as ethereum from '@adapters/curve-dex/ethereum'
import * as fantom from '@adapters/curve-dex/fantom'
import * as optimism from '@adapters/curve-dex/optimism'
import * as polygon from '@adapters/curve-dex/polygon'
import type { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'curve-dex',
  arbitrum,
  avalanche,
  ethereum,
  fantom,
  optimism,
  polygon,
}

export default adapter
