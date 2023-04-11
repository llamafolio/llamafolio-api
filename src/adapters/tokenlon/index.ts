
import { Adapter } from '@lib/adapter';

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'tokenlon',
  ethereum
};

export default adapter;

