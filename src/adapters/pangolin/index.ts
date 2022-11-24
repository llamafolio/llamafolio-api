import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'pangolin',
  avax,
}

export default adapter
