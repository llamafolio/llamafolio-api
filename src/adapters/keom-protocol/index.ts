import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'keom-protocol',
  polygon: polygon,
}

export default adapter
