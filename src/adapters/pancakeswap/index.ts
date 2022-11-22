import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'pancakeswap',
  bsc,
}

export default adapter
