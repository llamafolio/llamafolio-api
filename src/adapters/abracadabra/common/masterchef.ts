import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { getMasterChefPoolsBalances, type GetResolvedUnderlyingsParams } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
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

export async function getAbracadabraFarmerContracts(ctx: BaseContext, masterChef: Contract): Promise<Contract[]> {
  return getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getUnderlyings: (ctx, { pools }) => getPairsDetails(ctx, pools),
  })
}

export async function getAbracadabraMasterChefBalances(ctx: BalancesContext, pools: Contract[], masterChef: Contract) {
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
    getResolvedUnderlyings: (ctx, { pools }) => getResolvedAbracadabraUnderlyings(ctx, { pools }),
  })
}

async function getResolvedAbracadabraUnderlyings(ctx: BalancesContext, { pools }: GetResolvedUnderlyingsParams) {
  const resolveLPUnderlyings = await getUnderlyingBalances(ctx, pools)
  return getCurveUnderlyingsBalances(ctx, resolveLPUnderlyings)
}
