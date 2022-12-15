import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from '../common/stake'

const STG: Token = {
  chain: 'bsc',
  address: '0xb0d502e938ed5f4df2e681fe6e419ff29631d62b',
  decimals: 18,
  symbol: 'STG',
}

const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool BSC',
  chain: 'bsc',
  address: '0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47',
  rewards: [STG],
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('bsc', lpStaking)

  return {
    contracts: { lpStaking, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, {
    pools: (...args) => getStakeBalances(...args, lpStaking),
  })

  return {
    balances,
  }
}
