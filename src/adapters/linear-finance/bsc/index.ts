import { getLinearLendBalances } from '@adapters/linear-finance/bsc/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lend: Contract = {
  chain: 'bsc',
  address: '0xce2c94d40e289915d4401c3802d75f6ca5fef57e',
  token: '0x762539b45A1dCcE3D36d080F74d1AED37844b878',
  currency: '0x4c494e4100000000000000000000000000000000000000000000000000000000',
  category: 'lend',
}

const debt: Contract = {
  chain: 'bsc',
  address: '0xd5c594fb9055e34926cdb46b32d427c09146e96a',
  token: '0x23e8a70534308a4AAF76fb8C32ec13d17a3BD89e',
  category: 'borrow',
}

export const getContracts = () => {
  return {
    contracts: { lend, debt },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lend: (...args) => getLinearLendBalances(...args, debt),
  })

  return {
    groups: [{ balances }],
  }
}
