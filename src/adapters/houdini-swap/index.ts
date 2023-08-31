import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'houdini-swap',
  ethereum,
}

export default adapter
