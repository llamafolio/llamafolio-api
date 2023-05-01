import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'benqi-lending',
  avalanche,
}

// TODO: rewards on lending/borrowing
// https://docs.benqi.fi/

export default adapter
