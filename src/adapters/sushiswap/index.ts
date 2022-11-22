import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'sushiswap',
  ethereum,
}

export default adapter
