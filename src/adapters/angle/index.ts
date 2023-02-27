
import { Adapter } from '@lib/adapter';

import * as ethereum from './ethereum';import * as arbitrum from './arbitrum';import * as optimism from './optimism';import * as polygon from './polygon';import * as avax from './avax'

const adapter: Adapter = {
  id: 'angle',
  ethereum,arbitrum,optimism,polygon,avax
};

export default adapter;

