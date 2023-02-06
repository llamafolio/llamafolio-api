
import { Adapter } from '@lib/adapter';

import * as ethereum from './ethereum';import * as polygon from './polygon';import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'balancer',
  ethereum,polygon,arbitrum
};

export default adapter;

