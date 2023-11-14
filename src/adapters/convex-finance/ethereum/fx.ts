// NOTE: same logic as Frax
import type { Contract } from '@lib/adapter'

export const cvxFxnStaking: Contract = {
  name: 'cvxFxnStaking',
  chain: 'ethereum',
  address: '0xec60cd4a5866fb3b0dd317a46d3b474a24e06bef',
  token: '0x365accfca291e7d3914637abf1f7635db165bb09', // FXN
  underlyings: ['0x183395dbd0b5e93323a7286d1973150697fffcb3'], // cvxFXN
  category: 'stake',
}
