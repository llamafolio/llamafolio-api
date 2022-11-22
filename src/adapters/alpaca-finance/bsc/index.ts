import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'

import { getDepositBalances, getFarmingBalances } from '../common/balances'
import { getContractsInfos, getPoolsContracts } from '../common/pool'

const FairLaunchBSC: Contract = {
  name: 'fairlaunchContractAddress',
  chain: 'bsc',
  address: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F',
}

function getPoolsBalances(ctx: BaseContext, chain: Chain, pools: Contract[]) {
  return Promise.all([getFarmingBalances(ctx, chain, pools), getDepositBalances(ctx, chain, pools)])
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('bsc', FairLaunchBSC)
  const poolsInfo = await getContractsInfos('bsc', pools)

  return {
    contracts: { pools: poolsInfo },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, { pools: getPoolsBalances })

  return {
    balances,
  }
}
