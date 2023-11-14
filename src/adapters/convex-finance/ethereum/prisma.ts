// NOTE: same logic as Frax
import type { Contract } from '@lib/adapter'

export const cvxPrismaStaking: Contract = {
  name: 'cvxPrismaStaking',
  chain: 'ethereum',
  address: '0x0c73f1cfd5c9dfc150c8707aa47acbd14f0be108',
  token: '0xda47862a83dac0c112ba89c6abc2159b95afd71c', // PRISMA
  underlyings: ['0x34635280737b5bfe6c7dc2fc3065d60d66e78185'], // cvxPRISMA
  category: 'stake',
}
