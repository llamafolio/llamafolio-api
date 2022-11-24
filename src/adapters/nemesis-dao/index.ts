import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'nemesis-dao',
  bsc,
}

export default adapter
