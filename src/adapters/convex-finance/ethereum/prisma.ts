import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

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
} as const

export const cvxPrisma: Contract = {
  name: 'cvxPrisma',
  chain: 'ethereum',
  address: '0x34635280737b5bfe6c7dc2fc3065d60d66e78185',
  token: '0xda47862a83dac0c112ba89c6abc2159b95afd71c', // PRISMA
}

export const cvxPrismaStaking: Contract = {
  name: 'cvxPrismaStaking',
  chain: 'ethereum',
  address: '0x0c73f1cfd5c9dfc150c8707aa47acbd14f0be108',
  token: '0xda47862a83dac0c112ba89c6abc2159b95afd71c', // PRISMA
  underlyings: ['0x34635280737b5bfe6c7dc2fc3065d60d66e78185'], // cvxPRISMA
  rewards: ['0xda47862a83dac0c112ba89c6abc2159b95afd71c', '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'], // PRISMA, CVX
  category: 'stake',
}

export async function getCvxPrismaBalance(ctx: BalancesContext, cvxPrisma: Contract) {
  const balanceOf = await call({ ctx, target: cvxPrisma.address, abi: erc20Abi.balanceOf, params: [ctx.address] })

  const balance: Balance = {
    ...cvxPrisma,
    amount: balanceOf,
  }

  return balance
}

export async function getStakedCvxPrismaBalance(ctx: BalancesContext, cvxPrismaStaking: Contract) {
  const [balanceOf, claimableRewards] = await Promise.all([
    call({ ctx, target: cvxPrismaStaking.address, abi: erc20Abi.balanceOf, params: [ctx.address] }),
    call({ ctx, target: cvxPrismaStaking.address, abi: abi.claimableRewards, params: [ctx.address] }),
  ])

  const cvxPrisma = cvxPrismaStaking.underlyings![0] as Contract
  const prisma = cvxPrismaStaking.rewards![0] as Contract
  const cvx = cvxPrismaStaking.rewards![1] as Contract

  const balance: Balance = {
    ...cvxPrismaStaking,
    amount: balanceOf,
    underlyings: [{ ...cvxPrisma, amount: balanceOf }],
    rewards: [
      { ...prisma, amount: claimableRewards[0].amount },
      { ...cvx, amount: claimableRewards[1].amount },
    ],
    category: 'stake',
  }

  return balance
}
