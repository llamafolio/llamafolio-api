import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getGaugesBalances } from '../common/balance'
import { getLockerBalances } from './locker'
import { getLpCurveBalances } from './lpBalance'
import { getGaugesContracts, getPoolsContracts } from './pools'
import { getVesterBalances } from './vester'

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2',
  token: '0xD533a949740bb3306d119CC777fa900bA034cd52',
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

const vesters: Contract[] = [
  { chain: 'ethereum', address: '0xd2d43555134dc575bf7279f4ba18809645db0f1d' },
  { chain: 'ethereum', address: '0x2a7d59e327759acd5d11a8fb652bf4072d28ac04' },
  { chain: 'ethereum', address: '0x679fcb9b33fc4ae10ff4f96caef49c1ae3f8fa67' },
  { chain: 'ethereum', address: '0x575ccd8e2d300e2377b43478339e364000318e2c' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, metaRegistry)
  const gauges = await getGaugesContracts(ctx, pools, CRV)

  return {
    contracts: { gauges, pools, metaRegistry, locker, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getLpCurveBalances(...args, metaRegistry),
    gauges: (...args) => getGaugesBalances(...args, metaRegistry),
    locker: (...args) => getLockerBalances(...args, feeDistributor),
    vesters: getVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}
