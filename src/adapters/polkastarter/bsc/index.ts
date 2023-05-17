import { getPolkaLockedBalance } from '@adapters/polkastarter/common/lock'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'bsc',
  address: '0xd558675a8c8e1fd45002010bac970b115163de3a',
  token: '0x7e624fa0e1c4abfd309cc15719b7e2580887f570',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getPolkaLockedBalance,
  })

  return {
    groups: [{ balances }],
  }
}
