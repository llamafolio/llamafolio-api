import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from './gauge'
import { getLockerBalances } from './locker'
import { getPoolsBalances, getPoolsContracts } from './pools'

const CRVToken: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const IIICrvToken: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3Crv',
}

const GaugeController: Contract = {
  name: 'Curve.fi: Gauge Controller',
  chain: 'ethereum',
  address: '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB',
}

const feeDistributorContract: Contract = {
  chain: 'ethereum',
  address: '0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc',
  name: 'FeeDistributor',
  underlyings: [IIICrvToken],
}

const lockerContract: Contract = {
  chain: 'ethereum',
  address: '0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2',
  name: 'Locker',
  underlyings: [CRVToken],
  rewards: [feeDistributorContract],
}

const MetaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
  rewards: [CRVToken],
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('ethereum', MetaRegistry)
  const gaugeContracts = await getGaugesContracts('ethereum', pools, GaugeController)

  return {
    contracts: { pools, MetaRegistry, lockerContract, gaugeContracts, feeDistributorContract },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    lockerContract: (...args) => getLockerBalances(...args, feeDistributorContract),
    pools: (...args) => getPoolsBalances(...args, MetaRegistry),
    gaugeContracts: (...args) => getGaugesBalances(...args, MetaRegistry),
  })

  return {
    balances,
  }
}
