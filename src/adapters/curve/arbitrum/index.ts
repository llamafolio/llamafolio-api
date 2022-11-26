import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPools, getPoolsBalancesFromGauges } from '../common/pools'

const gaugeController: Contract = {
  name: 'Curve.fi: Gauge Controller',
  chain: 'arbitrum',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

const provider: Contract = {
  name: 'Curve Main Provider',
  chain: 'arbitrum',
  address: '0x0000000022D53366457F9d5E68Ec105046FC4383',
}

export const getContracts = async () => {
  const pools = await getPools('arbitrum', provider, gaugeController)

  return {
    contracts: { pools, provider },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    pools: getPoolsBalancesFromGauges,
  })

  return {
    balances,
  }
}
