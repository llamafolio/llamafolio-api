import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// import { resolveBalances } from '@lib/balance'
// import { getGaugesBalances } from '../common/gauge'
// import { getLockerBalances } from '../common/locker'
import { getPoolsBalances, getPoolsContracts } from './pools'

// const GaugeController: Contract = {
//   name: 'Curve.fi: Gauge Controller',
//   chain: 'polygon',
//   address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
// }

const Registry: Contract = {
  name: 'Main Registry',
  chain: 'avax',
  address: '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('avax', Registry)

  return {
    contracts: { pools, Registry },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'avax', contracts, {
    pools: (...args) => getPoolsBalances(...args, Registry),
  })
  //   const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
  //     lockerContract: (...args) => getLockerBalances(...args, feeDistributorContract),
  //     pools: (...args) => getPoolsBalances(...args, MetaRegistry),
  //     gaugeContracts: (...args) => getGaugesBalances(...args, MetaRegistry),
  //   })

  return {
    balances,
  }
}
