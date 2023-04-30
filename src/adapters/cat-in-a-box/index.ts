import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'cat-in-a-box',
  ethereum,
}

export default adapter
