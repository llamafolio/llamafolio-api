import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'notional',
  ethereum: ethereum,
}

// TODO: Find how to get pendingRewards + Metadatas (Debt Maturity, HFs..)
export default adapter
