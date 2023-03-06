import { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'sonne-finance',
  optimism,
}

export default adapter
