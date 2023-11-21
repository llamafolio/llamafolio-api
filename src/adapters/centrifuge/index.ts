import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'centrifuge',
  ethereum: ethereum,
}

// TODO : Find the contract that users interact with and replace DAI with it to access balance function

export default adapter
