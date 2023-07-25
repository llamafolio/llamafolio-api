import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMultipleLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

import { getConvexGaugesBalances } from './balance'
import { getPoolsContracts } from './pool'
import { getCvxCrvStakeBalance, getCVXStakeBalance } from './stake'

const threeCrv: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3CRV',
}

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
}
const cvxFXS: Token = {
  chain: 'ethereum',
  address: '0xfeef77d3f69374f66429c91d732a244f074bdf74',
  symbol: 'cvxFXS',
  decimals: 18,
}

const FXS: Token = {
  chain: 'ethereum',
  address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
  symbol: 'FXS',
  decimals: 18,
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const cvxRewardPool: Contract = {
  chain: 'ethereum',
  address: '0xCF50b810E57Ac33B91dCF525C6ddd9881B139332',
  underlyings: [CVX],
  rewards: [CRV],
}

const locker: Contract = {
  name: 'Locker',
  displayName: 'Convex Locker',
  chain: 'ethereum',
  address: '0x72a19342e8f1838460ebfccef09f6585e32db86e',
  underlyings: [CVX],
}

const booster: Contract = {
  name: 'Convex Finance Booster',
  chain: 'ethereum',
  address: '0xf403c135812408bfbe8713b5a23a04b3d48aae31',
}

const cvxCRVStaker: Contract = {
  name: 'cvxCRVStaker',
  displayName: 'cvxCRV Staker',
  chain: 'ethereum',
  address: '0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e',
  underlyings: [cvxCRV],
  rewards: [CRV, CVX, threeCrv],
  rewarder: '0x7091dbb7fcbA54569eF1387Ac89Eb2a5C9F6d2EA',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, booster)

  return {
    contracts: {
      cvxCRVStaker,
      cvxRewardPool,
      locker,
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getConvexGaugesBalances(...args, metaRegistry),
    cvxRewardPool: getCVXStakeBalance,
    cvxCRVStaker: getCvxCrvStakeBalance,
    locker: (...args) => getMultipleLockerBalances(...args, CVX, [cvxCRV, cvxFXS, FXS], true),
  })

  return {
    groups: [{ balances }],
  }
}
