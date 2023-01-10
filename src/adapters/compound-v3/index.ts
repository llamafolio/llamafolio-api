import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'compound-v3',
  ethereum,
}

export default adapter
