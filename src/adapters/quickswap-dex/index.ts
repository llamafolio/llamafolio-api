import { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'quickswap-dex',
  polygon,
}

export default adapter
