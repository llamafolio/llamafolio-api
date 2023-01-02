import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getMStakeContract(ctx: BaseContext, contract: Contract): Promise<Contract> {
  const [underlyingTokenAddressRes, rewardTokenAddressRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'spell',
        outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      ctx,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'mim',
        outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const [underlyings, rewards] = await Promise.all([
    getERC20Details(ctx, [underlyingTokenAddressRes.output]),
    getERC20Details(ctx, [rewardTokenAddressRes.output]),
  ])

  const stakeContract: Contract = {
    ...contract,
    underlyings,
    rewards,
  }

  return stakeContract
}

export async function getMStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const underlying = contract.underlyings?.[0]
  const reward = contract.rewards?.[0]

  const [balanceOfRes, pendingRewardsRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
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
    }),

    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
        name: 'pendingReward',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output.amount)
  const pendingRewards = BigNumber.from(pendingRewardsRes.output)

  if (contract) {
    const balance: Balance = {
      ...contract,
      rewards: undefined,
      amount: balanceOf,
      underlyings: [{ ...(underlying as Balance), amount: balanceOf }],
      category: 'stake',
    }

    if (reward) {
      balance.rewards = [{ ...reward, amount: pendingRewards }]
    }

    balances.push(balance)
  }
  return balances
}
