import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const veSYNC: Contract = {
  chain: 'ethereum',
  address: '0x216c9bb7380cde431662e37e30098d838d7e1dc8',
  underlyings: ['0xa41d2f8Ee4F47D3B860A149765A7dF8c3287b7F0'],
}

export const getContracts = () => {
  return {
    contracts: { veSYNC },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veSYNC: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
