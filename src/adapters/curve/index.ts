import * as arbitrum from '@adapters/curve/arbitrum'
import * as avalanche from '@adapters/curve/avalanche'
import * as ethereum from '@adapters/curve/ethereum'
import * as fantom from '@adapters/curve/fantom'
import * as optimism from '@adapters/curve/optimism'
import * as polygon from '@adapters/curve/polygon'
import type { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'curve',
  arbitrum,
  avalanche,
  ethereum,
  fantom,
  optimism,
  polygon,
}

export default adapter
