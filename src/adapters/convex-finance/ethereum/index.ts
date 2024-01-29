import { cvxCRVStaker, stkCvxCrvStaker } from '@adapters/convex-finance/ethereum/cvx'
import {
  cvxFpisStaking,
  cvxFxsStaking,
  getStkCvxFxsBalance,
  getStkCvxFxsContract,
} from '@adapters/convex-finance/ethereum/frax'
import { getConvexFraxPoolsBalances } from '@adapters/convex-finance/ethereum/fraxBalance'
import { getConvexFraxPoolsContracts } from '@adapters/convex-finance/ethereum/fraxPool'
import { cvxFxnStaking } from '@adapters/convex-finance/ethereum/fx'
import { getConvexLockerBalances } from '@adapters/convex-finance/ethereum/locker'
import { getConvexGaugesBalances, getConvexPoolsContracts } from '@adapters/convex-finance/ethereum/pool'
import { cvxPrismaStaking } from '@adapters/convex-finance/ethereum/prisma'
import { getCvxCrvStakeBalance, getCvxStakeBalance, getStkCvxCrvBalance } from '@adapters/convex-finance/ethereum/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const cvxRewardPool: Contract = {
  chain: 'ethereum',
  address: '0xCF50b810E57Ac33B91dCF525C6ddd9881B139332',
  underlyings: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'],
  rewards: ['0xD533a949740bb3306d119CC777fa900bA034cd52'],
}

const locker: Contract = {
  name: 'Locker',
  displayName: 'Convex Locker',
  chain: 'ethereum',
  address: '0x72a19342e8f1838460ebfccef09f6585e32db86e',
  underlyings: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'],
}

const booster: Contract = {
  name: 'Convex Finance Booster',
  chain: 'ethereum',
  address: '0xf403c135812408bfbe8713b5a23a04b3d48aae31',
}

const fraxRegistry: Contract = {
  name: 'Convex Pool Registry',
  chain: 'ethereum',
  address: '0x41a5881c17185383e19Df6FA4EC158a6F4851A69',
}

export const getContracts = async (ctx: BaseContext) => {
  const cvxCRV = cvxCRVStaker
  const stkCvxCrv = stkCvxCrvStaker
  const [stkCvxFpis, stkCvxFxs, stkCvxFxn, stkCvxPrisma, pools, fraxPools] = await Promise.all([
    getStkCvxFxsContract(ctx, cvxFpisStaking),
    getStkCvxFxsContract(ctx, cvxFxsStaking),
    getStkCvxFxsContract(ctx, cvxFxnStaking),
    getStkCvxFxsContract(ctx, cvxPrismaStaking),
    getConvexPoolsContracts(ctx, booster),
    getConvexFraxPoolsContracts(ctx, fraxRegistry),
  ])

  return {
    contracts: {
      pools,
      stkCvxFpis,
      stkCvxFxs,
      stkCvxFxn,
      stkCvxPrisma,
      cvxCRV,
      cvxRewardPool,
      stkCvxCrv,
      locker,
      fraxPools,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getConvexLockerBalances,
    cvxRewardPool: getCvxStakeBalance,
    cvxCRV: getCvxCrvStakeBalance,
    stkCvxCrv: getStkCvxCrvBalance,
    stkCvxFpis: getStkCvxFxsBalance,
    stkCvxFxs: getStkCvxFxsBalance,
    stkCvxFxn: getStkCvxFxsBalance,
    stkCvxPrisma: getStkCvxFxsBalance,
    pools: getConvexGaugesBalances,
    fraxPools: getConvexFraxPoolsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1642118400,
}
