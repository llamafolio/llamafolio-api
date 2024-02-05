import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'bedrock-unieth',
  ethereum: ethereum,
}

export default adapter
