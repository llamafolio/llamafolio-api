import type { BaseContext, Contract } from '@lib/adapter'

const HOPR: Contract = {
  chain: 'gnosis',
  address: '0xd057604a14982fe8d88c5fc25aac3267ea142a08',
  decimals: 18,
  symbol: 'HOPR',
}

export async function getHoprContracts(ctx: BaseContext, stakersAddresses: `0x${string}`[]): Promise<Contract[]> {
  return stakersAddresses.map((address) => ({ chain: ctx.chain, address, token: HOPR.address, rewards: [HOPR] }))
}
