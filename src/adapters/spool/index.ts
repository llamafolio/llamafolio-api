import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'spool-protocol',
  ethereum,
}

export default adapter
