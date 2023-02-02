import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'alchemix-v2',
  ethereum,
  fantom,
}

export default adapter
