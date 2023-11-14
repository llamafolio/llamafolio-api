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
        internalType: 'struct cvxPrismaStaking.EarnedData[]',
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

export const cvxPrismaStaking: Contract = {
  name: 'cvxPrismaStaking',
  chain: 'ethereum',
  address: '0x0c73f1cfd5c9dfc150c8707aa47acbd14f0be108',
  token: '0xda47862a83dac0c112ba89c6abc2159b95afd71c', // PRISMA
  underlyings: ['0x34635280737b5bfe6c7dc2fc3065d60d66e78185'], // cvxPRISMA
  category: 'stake',
}

export async function getCvxPrismaStakingContract(ctx: BaseContext) {
  const rewardTokenLength = await call({ ctx, target: cvxPrismaStaking.address, abi: abi.rewardTokenLength })
  const rewardsRes = await multicall({
    ctx,
    calls: rangeBI(0n, rewardTokenLength).map((idx) => ({ target: cvxPrismaStaking.address, params: [idx] }) as const),
    abi: abi.rewardTokens,
  })

  const contract: Contract = {
    ...cvxPrismaStaking,
    rewards: mapSuccessFilter(rewardsRes, (reward) => reward.output),
  }

  return contract
}

export async function getStakedCvxPrismaBalance(ctx: BalancesContext, cvxPrismaStaking: Contract) {
  const [balanceOf, claimableRewards] = await Promise.all([
    call({ ctx, target: cvxPrismaStaking.address, abi: erc20Abi.balanceOf, params: [ctx.address] }),
    call({ ctx, target: cvxPrismaStaking.address, abi: abi.claimableRewards, params: [ctx.address] }),
  ])

  const cvxPrisma = cvxPrismaStaking.underlyings![0] as Contract
  const rewards = (cvxPrismaStaking.rewards as Contract[]).map((reward, idx) => ({
    ...reward,
    amount: claimableRewards[idx]?.amount || 0n,
  }))

  const balance: Balance = {
    ...cvxPrismaStaking,
    amount: balanceOf,
    underlyings: [{ ...cvxPrisma, amount: balanceOf }],
    rewards,
    category: 'stake',
  }

  return balance
}
