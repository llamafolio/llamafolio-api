import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getRewardsBalance: {
    inputs: [
      {
        internalType: 'address[]',
        name: 'assets',
        type: 'address[]',
      },
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'getRewardsBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const Silo: { [key: string]: Token } = {
  arbitrum: {
    chain: 'arbitrum',
    address: '0x0341c0c0ec423328621788d4854119b97f44e391',
    decimals: 18,
    symbol: 'Silo',
  },
  ethereum: {
    chain: 'ethereum',
    address: '0x6f80310CA7F2C654691D1383149Fa1A57d8AB1f8',
    decimals: 18,
    symbol: 'Silo',
  },
}

export async function getSiloBalances(
  ctx: BalancesContext,
  routers: Contract[],
  incentive: Contract,
): Promise<Balance[]> {
  //Avoid duplicates since pools are stored in router objects
  const pools = Array.from(new Set(routers.flatMap((router) => router.pools)))

  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const userSuppliesBalances = mapSuccessFilter(userBalances, (res, idx) => ({
    ...pools[idx],
    amount: res.output,
    underlyings: pools[idx].underlyings as Contract[],
    rewards: undefined,
    category: pools[idx].category as Category,
  }))

  return getSiloRewards(ctx, userSuppliesBalances, incentive)
}

const getSiloRewards = async (ctx: BalancesContext, pools: Balance[], incentive: Contract): Promise<Balance[]> => {
  const nonEmptyPools = pools.filter((pool) => pool.amount > 0n)

  const userRewardsBalancesRes = await multicall({
    ctx,
    calls: nonEmptyPools.map((pool) => ({ target: incentive.address, params: [[pool.address], ctx.address] }) as const),
    abi: abi.getRewardsBalance,
  })

  const userRewards: Balance[] = mapSuccessFilter(userRewardsBalancesRes, (res) => ({
    ...Silo[ctx.chain],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }))

  return [...nonEmptyPools, ...userRewards]
}
