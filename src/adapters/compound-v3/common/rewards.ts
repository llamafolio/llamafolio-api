import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getRewardOwed: {
    inputs: [
      { internalType: 'address', name: 'comet', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getRewardOwed',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'owed', type: 'uint256' },
        ],
        internalType: 'struct CometRewards.RewardOwed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

const COMP: Token = {
  chain: 'ethereum',
  address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  decimals: 18,
  symbol: 'COMP',
}

export async function getRewardBalances(
  ctx: BalancesContext,
  rewarder: Contract,
  compounders: Contract[],
): Promise<Balance[]> {
  const rewards: Balance[] = []

  const pendingCompRewardsRes = await multicall({
    ctx,
    calls: compounders.map(
      (contract) => ({ target: rewarder.address, params: [contract.address, ctx.address] } as const),
    ),
    abi: abi.getRewardOwed,
  })

  for (let idx = 0; idx < compounders.length; idx++) {
    const pendingCompRewardRes = pendingCompRewardsRes[idx]

    if (!pendingCompRewardRes.success) {
      continue
    }

    rewards.push({
      chain: ctx.chain,
      decimals: COMP.decimals,
      symbol: COMP.symbol,
      address: COMP.address,
      amount: pendingCompRewardRes.output.owed,
      category: 'reward',
    })
  }

  return rewards
}
