import { getFydeFarmBalance } from '@adapters/fyde-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const TRSY: Contract = {
  chain: 'ethereum',
  address: '0x87cc45fff5c0933bb6af6bae7fc013b7ec7df2ee',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x6c7441c76d85d7ab43eacd076d37b0775f5c32f7',
  token: '0x87cc45fff5c0933bb6af6bae7fc013b7ec7df2ee',
}

export const getContracts = () => {
  return {
    contracts: { TRSY, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    TRSY: getFydeFarmBalance,
    staker: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
