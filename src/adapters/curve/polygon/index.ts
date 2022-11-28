import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getFarmPoolsBalances, getFarmPoolsContracts } from '../common/farm'
import { getLpPoolsBalances } from '../common/lp'
import { getLpPoolsContracts } from '../common/pool'

const CRVToken: Token = {
  chain: 'polygon',
  address: '0x172370d5cd63279efa6d502dab29171933a610af',
  decimals: 18,
  symbol: 'CRV',
}

const gaugeController: Contract = {
  name: 'Curve.fi: Gauge Controller',
  chain: 'polygon',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

const provider: Contract = {
  name: 'Curve Main Provider',
  chain: 'polygon',
  address: '0x0000000022D53366457F9d5E68Ec105046FC4383',
}

export const getContracts = async () => {
  const pools = await getFarmPoolsContracts('polygon', provider, gaugeController)
  const lpPools = await getLpPoolsContracts('polygon', provider)

  return {
    contracts: { pools, provider, lpPools, CRVToken },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'polygon', contracts, {
    pools: (...args) => getFarmPoolsBalances(...args, CRVToken),
    lpPools: getLpPoolsBalances,
  })

  return {
    balances,
  }
}
