import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'coinwind',
  bsc,
  // TODO: Find masterChef contract to export common farm logic on ethereum chain
}

export default adapter
