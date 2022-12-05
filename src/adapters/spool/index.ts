import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'spool-protocol',
  ethereum,
}

// TODO : Find the logic around strategies used to farm

export default adapter
