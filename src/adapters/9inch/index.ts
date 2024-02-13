import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: '9inch',
  ethereum: ethereum,
}

export default adapter
