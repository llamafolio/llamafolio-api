import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmPoolsBalances, getFarmPoolsContracts } from '../common/farm'
import { getLpPoolsBalances, getLpPoolsContracts } from '../common/lp'

const gaugeController: Contract = {
  name: 'Curve.fi: Gauge Controller',
  chain: 'optimism',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

const provider: Contract = {
  name: 'Curve Main Provider',
  chain: 'optimism',
  address: '0x0000000022D53366457F9d5E68Ec105046FC4383',
}

export const getContracts = async () => {
  const pools = await getFarmPoolsContracts('optimism', provider, gaugeController)
  const lpPools = await getLpPoolsContracts('optimism', provider)

  return {
    contracts: { pools, provider, lpPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'optimism', contracts, {
    pools: getFarmPoolsBalances,
    lpPools: (...args) => getLpPoolsBalances(...args, provider),
  })

  return {
    balances,
  }
}
