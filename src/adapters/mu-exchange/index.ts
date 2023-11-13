import type { Adapter } from '@lib/adapter'

import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'mu-exchange',
  gnosis: gnosis,
}

export default adapter
