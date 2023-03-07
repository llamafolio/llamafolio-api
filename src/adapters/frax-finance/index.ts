import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'frax-finance',
  ethereum,
}

export default adapter
