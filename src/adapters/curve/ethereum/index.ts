import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'
import { getLockerBalances } from './locker'

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const TriCrv: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3Crv',
}

const feeDistributor: Contract = {
  chain: 'ethereum',
  address: '0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc',
  name: 'FeeDistributor',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2',
  name: 'Locker',
}

export const getContracts = async () => {
  const registries = await getRegistries('ethereum', ['stableSwap', 'stableFactory', 'cryptoSwap', 'cryptoFactory'])
  const pools = await getPoolsContracts('ethereum', registries)
  const gauges = await getGaugesContracts('ethereum', registries, pools, CRV)

  return {
    contracts: {
      pools,
      gauges,
      locker,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pools: (ctx, chain, pools) => getPoolsBalances(ctx, chain, pools, { getPoolAddress: (contract) => contract.pool }),
    gauges: getGaugesBalances,
    locker: (...args) => getLockerBalances(...args, feeDistributor),
  })

  return {
    balances,
  }
}
