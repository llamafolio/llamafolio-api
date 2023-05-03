import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'olympus-dao',
  ethereum,
}

export default adapter
