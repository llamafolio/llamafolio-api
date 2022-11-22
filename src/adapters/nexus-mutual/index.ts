import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'nexus-mutual',
  ethereum,
}

export default adapter
