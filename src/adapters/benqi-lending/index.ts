import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'benqi-lending',
  avax,
}

// TODO: rewards on lending/borrowing
// https://docs.benqi.fi/

export default adapter
