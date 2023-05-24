import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'sentiment',
  arbitrum,
}

// TODO: Lending/Borrowing
// https://docs.sentiment.xyz/

export default adapter
