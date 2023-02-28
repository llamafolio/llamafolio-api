import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'badger-dao',
  ethereum,
}

export default adapter
