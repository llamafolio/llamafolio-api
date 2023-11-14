import type { Adapter } from '@lib/adapter'

import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'levinswap',
  gnosis: gnosis,
}

export default adapter
