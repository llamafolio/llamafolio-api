import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'vector-finance',
  avax,
}

export default adapter
