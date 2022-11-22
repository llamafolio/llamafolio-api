import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'

import { getDepositBalances, getFarmingBalances } from '../common/balances'
import { getContractsInfos, getPoolsContracts } from '../common/pool'

const MiniFL: Contract = {
  name: 'MiniFl',
  chain: 'fantom',
  address: '0x838B7F64Fa89d322C563A6f904851A13a164f84C',
}

function getPoolsBalances(ctx: BaseContext, chain: Chain, pools: Contract[]) {
  return Promise.all([getFarmingBalances(ctx, chain, pools), getDepositBalances(ctx, chain, pools)])
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('fantom', MiniFL)
  const poolsInfo = await getContractsInfos('fantom', pools)

  return {
    contracts: { pools: poolsInfo },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, { pools: getPoolsBalances })

  return {
    balances,
  }
}
