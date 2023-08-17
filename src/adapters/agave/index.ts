import type { Adapter } from '@lib/adapter'

import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'agave',
  gnosis,
}

export default adapter
