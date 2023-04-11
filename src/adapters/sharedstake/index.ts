import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'sharedstake',
  ethereum,
}

export default adapter
