import { getConvexGaugesBalances } from '@adapters/convex-finance/ethereum/balance'
import {
  cvxFpisStaking,
  cvxFxsStaking,
  getStkCvxFxsBalance,
  getStkCvxFxsContract,
} from '@adapters/convex-finance/ethereum/frax'
import { cvxFxnStaking } from '@adapters/convex-finance/ethereum/fx'
import { getConvexPoolsContracts } from '@adapters/convex-finance/ethereum/pool'
import { cvxPrismaStaking } from '@adapters/convex-finance/ethereum/prisma'
import { getCvxCrvStakeBalance, getCVXStakeBalance, getStkCvxCrvBalance } from '@adapters/convex-finance/ethereum/stake'
import { getPoolsContracts } from '@adapters/curve-dex/ethereum/pools'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMultipleLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

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

const stkCvxCrv: Contract = {
  chain: 'ethereum',
  address: '0xaa0c3f5f7dfd688c6e646f66cd2a6b66acdbe434',
  symbol: 'stkCvxCrv',
  decimals: 18,
  displayName: 'cvxCRV Staker',
  underlyings: [
    { chain: 'ethereum', address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7', symbol: 'cvxCRV', decimals: 18 },
  ],
  rewards: [CRV, CVX, threeCrv],
  rewarder: '0x7091dbb7fcbA54569eF1387Ac89Eb2a5C9F6d2EA',
}

export const getContracts = async (ctx: BaseContext) => {
  const [curvePools, stkCvxFpis, stkCvxFxs, stkCvxFxn, stkCvxPrisma] = await Promise.all([
    getPoolsContracts(ctx, metaRegistry),
    getStkCvxFxsContract(ctx, cvxFpisStaking),
    getStkCvxFxsContract(ctx, cvxFxsStaking),
    getStkCvxFxsContract(ctx, cvxFxnStaking),
    getStkCvxFxsContract(ctx, cvxPrismaStaking),
  ])

  const pools = await getConvexPoolsContracts(ctx, booster, curvePools)

  return {
    contracts: {
      stkCvxFpis,
      stkCvxFxs,
      stkCvxFxn,
      stkCvxPrisma,
      cvxCRVStaker,
      cvxRewardPool,
      locker,
      pools,
      stkCvxCrv,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getConvexGaugesBalances(...args, metaRegistry),
    cvxRewardPool: getCVXStakeBalance,
    cvxCRVStaker: getCvxCrvStakeBalance,
    locker: (...args) => getMultipleLockerBalances(...args, CVX, [cvxCRV, cvxFXS, FXS], true),
    stkCvxCrv: getStkCvxCrvBalance,
    stkCvxFpis: getStkCvxFxsBalance,
    stkCvxFxs: getStkCvxFxsBalance,
    stkCvxFxn: getStkCvxFxsBalance,
    stkCvxPrisma: getStkCvxFxsBalance,
  })

  return {
    groups: [{ balances }],
  }
}
