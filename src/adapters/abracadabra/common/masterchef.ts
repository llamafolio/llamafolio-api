import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { ADDRESS_ZERO } from '@lib/contract'
import { getMasterChefPoolsBalances, type GetResolvedUnderlyingsParams } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts, type GetUnderlyingsParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 21345,
  },
  pendingIce: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingIce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SPELL: Contract = {
  chain: 'ethereum',
  address: '0x090185f2135308bad17527004364ebcc2d37e5f6',
  decimals: 18,
  symbol: 'SPELL',
}

type AbracadabraPoolsBalance = Balance & {
  provider: string
}

export async function getAbracadabraFarmerContracts(
  ctx: BaseContext,
  masterChef: Contract,
  registry: Contract,
): Promise<Contract[]> {
  return getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getUnderlyings: (ctx, { pools }) => getAbracadabraUnderlyings(ctx, { pools, registry }),
  })
}

async function getAbracadabraUnderlyings(
  ctx: BaseContext,
  { pools, registry }: GetUnderlyingsParams & { registry: Contract },
) {
  return registry && getCurveUnderlyings(ctx, await getPairsDetails(ctx, pools), registry)
}

async function getCurveUnderlyings(ctx: BaseContext, pools: Contract[], registry: Contract) {
  const resolvedPools = pools.filter((pool) => pool.underlyings)
  const unresolvedPools = pools.filter((pool) => !pool.underlyings)

  const underlyingsRes = await multicall({
    ctx,
    calls: unresolvedPools.map((pool) => ({ target: registry.address, params: [pool.address] }) as const),
    abi: abi.get_underlying_coins,
  })

  unresolvedPools.forEach((pool, index) => {
    const underlyingRes = underlyingsRes[index]
    const underlyings: any = underlyingRes.success
      ? underlyingRes.output
          .map((address) => (address as `0x${string}`).toLowerCase())
          // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
          .filter((address) => (address as `0x${string}`) !== ADDRESS_ZERO)
          // replace ETH alias
          .map((address) => ((address as `0x${string}`) === ETH_ADDR ? ADDRESS_ZERO : address))
      : []

    pool.underlyings = underlyings
    pool.provider = 'curve'
    pool.pool = pool.address
    pool.lpToken = pool.address
  })

  return [...resolvedPools, ...unresolvedPools]
}

export async function getAbracadabraMasterChefBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
  registry: Contract,
) {
  return getMasterChefPoolsBalances(ctx, pools, {
    masterChefAddress: masterChef.address,
    rewardToken: SPELL,
    getUserPendingRewards: async (ctx, { masterChefAddress, pools, rewardToken }) => {
      const userPendingRewards = await multicall({
        ctx,
        calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
        abi: abi.pendingIce,
      })

      return mapSuccessFilter(userPendingRewards, (res: any, index) => {
        const pool = pools[index]
        const reward = rewardToken || (pool.rewards?.[0] as Contract)

        return [{ ...reward, amount: res.output }]
      })
    },
    getResolvedUnderlyings: (ctx, { pools }) => getResolvedAbracadabraUnderlyings(ctx, { pools, registry }),
  })
}

async function getResolvedAbracadabraUnderlyings(
  ctx: BalancesContext,
  { pools, registry }: GetResolvedUnderlyingsParams & { registry: Contract },
) {
  const curvedPoolBalances = pools.filter((pool) => (pool as AbracadabraPoolsBalance).provider === 'curve')
  const pairBalances = pools.filter((pool) => !(pool as AbracadabraPoolsBalance).provider)

  return Promise.all([
    registry && getUnderlyingsPoolsBalances(ctx, curvedPoolBalances, registry),
    getUnderlyingBalances(ctx, pairBalances),
  ])
}
