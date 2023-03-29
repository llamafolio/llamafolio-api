import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'charm-finance',
  ethereum,
}

export default adapter
