import { BaseContext, Contract } from '@lib/adapter'
import { Balance } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export const getStakeBalances = async (
  ctx: BaseContext,
  chain: Chain,
  stakingContract: Contract,
  looksContract: Contract,
) => {
  const [stakeBalanceOfRes, rewardsBalanceOfRes] = await Promise.all([
    call({
      chain,
      target: stakingContract.address,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
        name: 'calculateSharesValueInLOOKS',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: stakingContract.address,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
        name: 'calculatePendingRewards',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const stakeBalanceOf = BigNumber.from(stakeBalanceOfRes.output)
  const rewardsBalanceOf = BigNumber.from(rewardsBalanceOfRes.output)

  const stakebalance: Balance = {
    ...(looksContract as Balance),
    amount: stakeBalanceOf,
    rewards: [{ ...(stakingContract.rewards?.[0] as Balance), amount: rewardsBalanceOf }],
    category: 'stake',
  }

  return stakebalance
}

export const getCompounderBalances = async (
  ctx: BaseContext,
  chain: Chain,
  compounder: Contract,
  looksContract: Contract,
) => {
  const sharesValue = await call({
    chain,
    target: compounder.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'calculateSharesValueInLOOKS',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const compounderBalance: Balance = {
    ...(looksContract as Balance),
    amount: BigNumber.from(sharesValue.output),
    yieldKey: compounder.address,
    category: 'farm',
  }

  return compounderBalance
}
