import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'arrakis-finance',
  ethereum,
  polygon,
  optimism,
}

export default adapter
