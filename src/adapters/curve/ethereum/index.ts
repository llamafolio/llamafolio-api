import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGaugesBalances, getLpCurveBalances } from './balances'
import { getLockerBalances } from './locker'
import { getGaugesContracts, getPoolsContracts } from './pools'

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2',
  name: 'Locker',
}

const feeDistributor: Contract = {
  chain: 'ethereum',
  address: '0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc',
  name: 'FeeDistributor',
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const gaugeController: Contract = {
  name: 'Curve Gauge Controller',
  chain: 'ethereum',
  address: '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, metaRegistry)
  const gauges = await getGaugesContracts(ctx, gaugeController, pools, CRV)

  return {
    contracts: { gauges, pools, metaRegistry, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getLpCurveBalances(...args, metaRegistry),
    gauges: (...args) => getGaugesBalances(...args, metaRegistry),
    locker: (...args) => getLockerBalances(...args, feeDistributor),
  })

  return {
    balances,
  }
}
