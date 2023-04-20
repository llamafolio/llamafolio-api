import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'trustswap',
  ethereum,
}

export default adapter
