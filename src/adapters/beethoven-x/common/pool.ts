import { getBalancerBalances } from '@adapters/balancer/common/balance'
import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import type { GetResolvedUnderlyingsParams, GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetPoolsInfosParams, GetUnderlyingsParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import request, { gql } from 'graphql-request'

const abi = {
  lpTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpTokens',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingBeets: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingBeets',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const vault: Contract = {
  chain: 'fantom',
  address: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
}

export async function getBeethovenPools(ctx: BaseContext, url: string): Promise<Contract[]> {
  const query = gql`
    query pools {
      pools(first: 1000, orderBy: totalLiquidity, orderDirection: desc, where: { totalLiquidity_gt: "100" }) {
        id
        address
        symbol
        tokens {
          decimals
          symbol
          address
        }
      }
    }
  `
  const { pools }: any = await request(url, query)

  return pools
    .map((pool: any) => {
      const { address, tokens, id, symbol } = pool
      if (!address || !tokens || !id || !symbol) return null

      return {
        chain: ctx.chain,
        address,
        poolId: id,
        decimals: 18,
        underlyings: pool.tokens.map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
      }
    })
    .filter(isNotNullish)
}

export async function getBeethovenLpBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const balances = await getBalancerBalances(ctx, pools, vault)
  return balances.filter((balance) => balance.category !== 'farm')
}

export async function getBeethovenPoolsInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.lpTokens,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = res.output
    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })
}

export async function getBeethovenUnderlyings(ctx: BaseContext, { pools }: GetUnderlyingsParams): Promise<Contract[]> {
  const poolIds = await multicall({
    ctx,
    calls: pools.map((pool: any) => ({ target: pool.address }) as const),
    abi: abi.getPoolId,
  })

  const fmtPools = mapSuccessFilter(poolIds, (res, index) => ({ ...pools[index], poolId: res.output }))

  const underlyings = await multicall({
    ctx,
    calls: fmtPools.map((pool) => ({ target: vault.address, params: [pool.poolId] }) as const),
    abi: abi.getPoolTokens,
  })

  return mapSuccessFilter(underlyings, (res, index) => ({
    ...fmtPools[index],
    underlyings: res.output[0] as `0x${string}`[],
  }))
}

export async function getUserPendingBEETS(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingBeets,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)
    return [{ ...reward, amount: res.output }]
  })
}

export async function getBeethovenUnderlyingsBalances(ctx: BalancesContext, { pools }: GetResolvedUnderlyingsParams) {
  return getUnderlyingsBalancesFromBalancer(ctx, pools as IBalancerBalance[], vault)
}
