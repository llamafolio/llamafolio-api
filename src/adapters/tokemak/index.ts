import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'tokemak',
  ethereum,
}

export default adapter
