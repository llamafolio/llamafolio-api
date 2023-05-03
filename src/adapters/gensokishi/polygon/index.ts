import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGensokishiStakeBalances } from './stake'

const staker: Contract = {
  chain: 'polygon',
  address: '0x1b2430aeedececafb52a3ff8cc8321e9426fc82c',
  token: '0xa3c322ad15218fbfaed26ba7f616249f7705d945',
  rewards: ['0x204820b6e6feae805e376d2c6837446186e57981'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getGensokishiStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
