import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'cow-swap',
  ethereum: ethereum,
  gnosis: gnosis,
}

export default adapter
