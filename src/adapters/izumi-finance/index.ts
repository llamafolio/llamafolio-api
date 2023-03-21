// https://developer.izumi.finance/iZiSwap/deployed_contracts/mainnet.html

import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
// import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'izumi-finance',
  // bsc,
  ethereum,
  polygon,
  arbitrum,
}

export default adapter
