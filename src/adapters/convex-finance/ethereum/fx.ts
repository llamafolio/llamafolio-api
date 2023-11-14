import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct cvxFxnStaking.EarnedData[]',
        name: 'userRewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokenLength: {
    inputs: [],
    name: 'rewardTokenLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const cvxFxnStaking: Contract = {
  name: 'cvxFxnStaking',
  chain: 'ethereum',
  address: '0xec60cd4a5866fb3b0dd317a46d3b474a24e06bef',
  token: '0x365accfca291e7d3914637abf1f7635db165bb09', // FXN
  underlyings: ['0x183395dbd0b5e93323a7286d1973150697fffcb3'], // cvxFXN
  category: 'stake',
}

export async function getCvxFxnStakingContract(ctx: BaseContext) {
  const rewardTokenLength = await call({ ctx, target: cvxFxnStaking.address, abi: abi.rewardTokenLength })
  const rewardsRes = await multicall({
    ctx,
    calls: rangeBI(0n, rewardTokenLength).map((idx) => ({ target: cvxFxnStaking.address, params: [idx] }) as const),
    abi: abi.rewardTokens,
  })

  const contract: Contract = {
    ...cvxFxnStaking,
    rewards: mapSuccessFilter(rewardsRes, (reward) => reward.output),
  }

  return contract
}

export async function getStakedCvxFxnBalance(ctx: BalancesContext, cvxFxnStaking: Contract) {
  const [balanceOf, claimableRewards] = await Promise.all([
    call({ ctx, target: cvxFxnStaking.address, abi: erc20Abi.balanceOf, params: [ctx.address] }),
    call({ ctx, target: cvxFxnStaking.address, abi: abi.claimableRewards, params: [ctx.address] }),
  ])

  const cvxFxn = cvxFxnStaking.underlyings![0] as Contract

  const rewards = (cvxFxnStaking.rewards as Contract[]).map((reward, idx) => ({
    ...reward,
    amount: claimableRewards[idx]?.amount || 0n,
  }))

  const balance: Balance = {
    ...cvxFxnStaking,
    amount: balanceOf,
    underlyings: [{ ...cvxFxn, amount: balanceOf }],
    rewards,
    category: 'stake',
  }

  return balance
}
