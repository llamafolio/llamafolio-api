import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'strike',
  ethereum,
}

// TODO: Rewards on Lending/Borrowing, LP farming
// https://docs.strike.org/

export default adapter
