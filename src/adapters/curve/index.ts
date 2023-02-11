import * as arbitrum from '@adapters/curve/arbitrum'
// import * as avax from '@adapters/curve/avax'
import * as ethereum from '@adapters/curve/ethereum'
// import * as fantom from '@adapters/curve/fantom'
// import * as optimism from '@adapters/curve/optimism'
// import * as polygon from '@adapters/curve/polygon'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'curve',
  arbitrum,
  // avax,
  ethereum,
  // fantom,
  // optimism,
  // polygon,
}

/**
 * TODO:
 * - Extra rewards logics on ethereum
 * - Altchains
 */

export default adapter
