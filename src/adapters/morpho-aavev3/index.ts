import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'morpho-aavev3',
  ethereum,
}

export default adapter
