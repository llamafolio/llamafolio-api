import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'rocket-pool',
  ethereum,
}

export default adapter
