import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from '../common/stake'

const STG: Token = {
  chain: 'fantom',
  address: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590',
  decimals: 18,
  symbol: 'STG',
}
const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Fantom',
  chain: 'fantom',
  address: '0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03',
  rewards: [STG],
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('fantom', lpStaking)

  return {
    contracts: { lpStaking, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getStakeBalances(...args, lpStaking),
  })

  return {
    balances,
  }
}
