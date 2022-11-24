import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'inverse-finance',
  ethereum,
}

export default adapter
