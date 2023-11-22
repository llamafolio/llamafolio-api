import { getLockerBalances } from '@adapters/curve-dex/ethereum/locker'
import { getVesterBalances } from '@adapters/curve-dex/ethereum/vester'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getGaugesBalances } from '@lib/curve/farmBalance'
import { getCurvePoolBalances } from '@lib/curve/lpBalance'
import { getCurvePools } from '@lib/curve/pool'

const locker: Contract = {
  chain: 'ethereum',
  address: '0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2',
  token: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  name: 'Locker',
}

const feeDistributor: Contract = {
  chain: 'ethereum',
  address: '0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc',
  name: 'FeeDistributor',
}

const vesters: Contract[] = [
  { chain: 'ethereum', address: '0xd2d43555134dc575bf7279f4ba18809645db0f1d' },
  { chain: 'ethereum', address: '0x2a7d59e327759acd5d11a8fb652bf4072d28ac04' },
  { chain: 'ethereum', address: '0x679fcb9b33fc4ae10ff4f96caef49c1ae3f8fa67' },
  { chain: 'ethereum', address: '0x575ccd8e2d300e2377b43478339e364000318e2c' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCurvePools(ctx)
  const gauges = pools.filter((pool) => pool.gauge !== undefined)

  return {
    contracts: { pools, gauges, locker, vesters },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getLockerBalances(...args, feeDistributor),
    pools: getCurvePoolBalances,
    gauges: getGaugesBalances,
    vesters: getVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}
