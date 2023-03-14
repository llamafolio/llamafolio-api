
import { Adapter } from '@lib/adapter';

import * as ethereum from './ethereum';import * as avax from './avax'

const adapter: Adapter = {
  id: 'gro',
  ethereum,avax
};

export default adapter;

