import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  // DefiLlama slug
  id: 'my-defillama-id',
  ethereum,
}

export default adapter
