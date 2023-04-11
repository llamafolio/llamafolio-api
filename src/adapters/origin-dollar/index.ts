import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'origin-dollar',
  ethereum,
}

export default adapter
