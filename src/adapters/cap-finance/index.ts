import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'cap-finance',
  arbitrum,
}

// TODO: getPerpetualsBalances

export default adapter
