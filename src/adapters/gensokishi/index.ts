import { Adapter } from '@lib/adapter'

import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'gensokishi',
  polygon,
}

export default adapter
