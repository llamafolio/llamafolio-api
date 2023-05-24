import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'coinwind',
  bsc,
  ethereum,
}

// TODO: Find masterChef contract to export common farm logic on ethereum chain

export default adapter
