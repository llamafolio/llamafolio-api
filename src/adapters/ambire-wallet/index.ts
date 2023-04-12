import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'ambire-wallet',
  ethereum,
}

export default adapter
