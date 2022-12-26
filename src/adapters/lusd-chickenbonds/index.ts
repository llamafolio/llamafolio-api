import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'lusd-chickenbonds',
  ethereum,
}

export default adapter
