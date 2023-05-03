import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'equalizer-exchange',
  fantom,
}

export default adapter
