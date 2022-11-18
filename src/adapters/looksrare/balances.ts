import { BaseContext, Contract } from '@lib/adapter'
import { Balance } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

const LOOKS: Contract = {
  name: 'LooksRare Token',
  chain: 'ethereum',
  address: '0xf4d2888d29D722226FafA5d9B24F9164c092421E',
  decimals: 18,
  symbols: 'LOOKS',
}

export const getStakeBalances = async (ctx: BaseContext, chain: Chain, stakingContract?: Contract) => {
  if (!stakingContract) {
    return
  }

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
    ...(LOOKS as Balance),
    amount: stakeBalanceOf,
    category: 'stake',
  }

  if (stakingContract.rewards?.[0]) {
    stakebalance.rewards = [{ ...stakingContract.rewards?.[0], amount: rewardsBalanceOf }]
  }

  return stakebalance
}

export const getCompounderBalances = async (ctx: BaseContext, chain: Chain, compounder?: Contract) => {
  if (!compounder) {
    return
  }

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
    ...(LOOKS as Balance),
    amount: BigNumber.from(sharesValue.output),
    yieldKey: compounder.address,
    category: 'farm',
  }

  return compounderBalance
}
