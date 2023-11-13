import { getMasterChefPoolsNFTBalances } from '@adapters/baseswap/base/balance'
import { getMasterChefPoolsNFTContracts } from '@adapters/baseswap/base/contract'
import { getLockersBalances } from '@adapters/baseswap/base/locker'
import { getUserPendingBSWAP } from '@adapters/baseswap/base/reward'
import { getBaseSwapStakeBalances, getBaseSwapStakeContracts } from '@adapters/baseswap/base/stake'
import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

// https://base-swap-1.gitbook.io/baseswap/info/smart-contracts
// BSWAP: 0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9
// BSX: 0xd5046b976188eb40f6de40fb527f89c05b323385
// xBSX: 0xe4750593d1fc8e74b31549212899a72162f315fa
// ARX: 0x58ed4fd0c3d930b674ba50a293f03ef6cd7de7a3
// MASTERCHEF: 0x6Fc0f134a1F20976377b259687b1C15a5d422B47
// FACTORY: 0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB
// ROUTER: 0x327Df1E6de05895d2ab08513aaDD9313Fe505d86
// OLD MASTERCHEF: 0x2B0A43DCcBD7d42c18F6A83F86D1a19fA58d541A
// BASEX V3 FACTORY: 0x38015D05f4fEC8AFe15D7cc0386a126574e8077B
// BASEX V3 SWAPROUTER: 0x1B8eea9315bE495187D873DA7773a874545D9D48
// BASEX V3 NONFUNGIBLEPOSITIONMANAGER: 0xDe151D5c92BfAA288Db4B67c21CD55d5826bCc93

const stakerAddresses: `0x${string}`[] = [
  '0x86dbd5baae91ac576e8e5197eb2497603d0056ea',
  '0x64fcfa940f286af1261107f993189379e8d3ae1c',
  '0x326929eae4e1923b9d08de6bd8b2e16f7dd35cd4',
  '0x55da9a8a85d37764934a8915621baa00fafdc3eb',
  '0x26fd5de668f091222791cc0ea45ac072d7bfe0cd',
]

const BSWAP: Token = {
  chain: 'base',
  address: '0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9',
  symbol: 'BSWAP',
  decimals: 18,
}

const masterChef: Contract = {
  chain: 'base',
  address: '0x2b0a43dccbd7d42c18f6a83f86d1a19fa58d541a',
  name: 'MasterChefV2',
}

const masterChef2: Contract = {
  chain: 'base',
  address: '0x6fc0f134a1f20976377b259687b1c15a5d422b47',
  name: 'MasterChef',
}

const lockManager: Contract = {
  chain: 'base',
  address: '0x4e4c89937f85bd101c7fcb273435ed89b49ad0b0',
}

export const factory: Contract = {
  chain: 'base',
  address: '0x38015D05f4fEC8AFe15D7cc0386a126574e8077B',
}

const nonFungiblePositionManager: Contract = {
  chain: 'base',
  address: '0xDe151D5c92BfAA288Db4B67c21CD55d5826bCc93',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 300

  const [pools, poolsNfts, stakers, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getMasterChefPoolsNFTContracts(ctx, masterChef2),
    getBaseSwapStakeContracts(ctx, stakerAddresses),
    getPairsContracts({
      ctx,
      factoryAddress: '0xfda619b6d20975be80a10332cd39b9a4b0faa8bb',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pairs,
      pools,
      poolsNfts,
      lockManager,
      nonFungiblePositionManager,
      stakers,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    poolsNfts: getMasterChefPoolsNFTBalances,
    lockManager: (...args) => getLockersBalances(...args, contracts.pairs || []),

    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: BSWAP,
        getUserPendingRewards: (...args) => getUserPendingBSWAP(...args),
      }),

    stakers: getBaseSwapStakeBalances,
    // TODO: manage extreme values or close to 0 to prevent extreme underlyings values `ex: 0xd3f85ade70adf48ed17c8cb182b8b1aff542e51f`
    nonFungiblePositionManager: (ctx, nonFungiblePositionManager) =>
      getPoolsBalances(ctx, nonFungiblePositionManager, factory),
  })

  return {
    groups: [{ balances }],
  }
}
