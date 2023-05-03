import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'uniswap-v2',
  ethereum,
}

export default adapter
