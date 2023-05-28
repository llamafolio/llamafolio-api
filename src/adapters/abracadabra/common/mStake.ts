import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  mim: {
    inputs: [],
    name: 'mim',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  spell: {
    inputs: [],
    name: 'spell',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'rewardDebt', type: 'uint128' },
      { internalType: 'uint128', name: 'lastAdded', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMStakeContract(ctx: BaseContext, contract: Contract): Promise<Contract> {
  const [underlyingTokenAddressRes, rewardTokenAddressRes] = await Promise.all([
    call({ ctx, target: contract.address, abi: abi.spell }),
    call({ ctx, target: contract.address, abi: abi.mim }),
  ])

  const stakeContract: Contract = {
    ...contract,
    underlyings: [underlyingTokenAddressRes],
    rewards: [rewardTokenAddressRes],
  }

  return stakeContract
}

export async function getMStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const underlying = contract.underlyings?.[0]
  const reward = contract.rewards?.[0]

  const [[amount], pendingRewards] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.pendingReward }),
  ])

  if (contract) {
    const balance: Balance = {
      ...contract,
      rewards: undefined,
      amount,
      underlyings: [{ ...(underlying as Balance), amount }],
      category: 'stake',
    }

    if (reward) {
      balance.rewards = [{ ...(reward as Contract), amount: pendingRewards }]
    }

    balances.push(balance)
  }
  return balances
}
