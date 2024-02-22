import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as linea from './linea'
import * as moonbeam from './moonbeam'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'qidao',
  linea: linea,
  ethereum: ethereum,
  optimism: optimism,
  base: base,
  avalanche: avalanche,
  fantom: fantom,
  arbitrum: arbitrum,
  polygon: polygon,
  moonbeam: moonbeam,
}

export default adapter
