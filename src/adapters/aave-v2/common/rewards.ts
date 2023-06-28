import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getRewardsBalance: {
    inputs: [
      { internalType: 'address[]', name: 'assets', type: 'address[]' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendingRewardsBalances(
  ctx: BalancesContext,
  incentiveController: Contract,
  rewardToken: Contract,
  contracts: Contract[],
): Promise<Balance[]> {
  const assetsAddressesList: any = contracts
    .filter((contract) => contract.category === 'lend')
    .map((contract) => contract.address)

  const rewards: Balance[] = []

  const userRewardsRes = await call({
    ctx,
    target: incentiveController.address,
    params: [assetsAddressesList, ctx.address],
    abi: abi.getRewardsBalance,
  })

  rewards.push({
    chain: rewardToken.chain,
    address: rewardToken.address,
    decimals: rewardToken.decimals,
    symbol: rewardToken.symbol,
    amount: userRewardsRes,
    underlyings: rewardToken.underlyings as Contract[],
    category: 'reward',
  })

  return rewards
}
