import { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'scream',
  fantom,
}

// TODO: Missing rewards, but there's a suspicious access denied to the docs according to the user's country
// https://docs.scream.sh/

export default adapter
