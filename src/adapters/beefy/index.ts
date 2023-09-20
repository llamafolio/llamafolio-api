import type { Adapter } from '@lib/adapter'

import * as ethereum from './v2/ethereum'

const adapter: Adapter = {
  id: 'beefy',
  ethereum,
}

export default adapter
