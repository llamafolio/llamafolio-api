import { Adapter } from '@lib/adapter'

import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'velodrome',
  optimism,
}

export default adapter
