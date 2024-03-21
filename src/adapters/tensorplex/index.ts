import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'tensorplex',
  ethereum: ethereum,
}

export default adapter
