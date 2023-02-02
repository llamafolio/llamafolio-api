
import { Adapter } from '@lib/adapter';

import * as ethereum from './ethereum';import * as optimism from './optimism';import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'alchemix',
  ethereum,optimism,fantom
};

export default adapter;

