import { Adapter } from '@lib/adapter'

import * as avax from './avax'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'ribbon-finance',
  ethereum,
  avax,
}

export default adapter
