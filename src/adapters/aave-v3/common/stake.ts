import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const AAVE: Contract = {
  chain: 'ethereum',
  address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  decimals: 18,
  symbol: 'AAVE',
}

export async function getAaveStakeBalances(ctx: BalancesContext, pool: Contract, vault: Contract) {
  const [shareBalance, rewardsBalance] = await Promise.all([
    call({
      ctx,
      target: pool.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: pool.address,
      params: [ctx.address],
      abi: abi.getTotalRewardsBalance,
    }),
  ])

  const poolBalance: Balance = {
    ...(pool as Balance),
    amount: shareBalance,
    rewards: [{ ...AAVE, amount: rewardsBalance }],
    category: 'stake',
  }

  return getUnderlyingsBalancesFromBalancer(ctx, [poolBalance] as IBalancerBalance[], vault, {
    getAddress: (balance: Balance) => balance.token!,
    getCategory: (balance: Balance) => balance.category,
  })
}
