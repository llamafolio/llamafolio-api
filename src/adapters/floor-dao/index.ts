import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'floor-dao',
  ethereum,
}

export default adapter
