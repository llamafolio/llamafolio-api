import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'

import { getCvxCliffRatio } from './utils'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  cvxCrvStakingWrappingEarned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct CvxCrvStakingWrapper.EarnedData[]',
        name: 'claimable',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

const threeCrv: Contract = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3CRV',
}

const CRV: Contract = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Contract = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getCvxCrvStakeBalance(ctx: BalancesContext, cvxCrv: Contract): Promise<Balance> {
  const [balanceOf, crvEarned, cvxTotalSupply, pending3CRVEarned] = await Promise.all([
    call({ ctx, target: cvxCrv.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: cvxCrv.address, params: [ctx.address], abi: abi.earned }),
    call({ ctx, target: CVX.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: cvxCrv.rewarder, params: [ctx.address], abi: abi.earned }),
  ])

  if (crvEarned === 0n) {
    return {
      ...(cvxCrv as Balance),
      amount: balanceOf,
      category: 'stake',
    }
  } else {
    const cvxEarned = getCvxCliffRatio(cvxTotalSupply, crvEarned)
    const rewards = [
      { ...CRV, amount: crvEarned },
      { ...CVX, amount: cvxEarned },
      { ...threeCrv, amount: pending3CRVEarned },
    ]

    const balance: Balance = {
      ...(cvxCrv as Balance),
      amount: balanceOf,
      rewards,
      category: 'stake',
    }

    return getCurveUnderlyingsBalances(ctx, balance)
  }
}

export async function getStkCvxCrvBalance(ctx: BalancesContext, stkCvxCrv: Contract): Promise<Balance> {
  const [balanceOf, earned] = await Promise.all([
    call({ ctx, target: stkCvxCrv.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: stkCvxCrv.address, params: [ctx.address], abi: abi.cvxCrvStakingWrappingEarned }),
  ])

  const rewards = [CRV, CVX, threeCrv].map((reward, index) => {
    return { ...reward, amount: earned[index].amount }
  })

  const balance: Balance = {
    ...(stkCvxCrv as Balance),
    amount: balanceOf,
    rewards,
    category: 'stake',
  }

  return getCurveUnderlyingsBalances(ctx, balance)
}

export async function getCvxStakeBalance(ctx: BalancesContext, cvxRewardPool: Contract): Promise<Balance> {
  const [balanceOf, pendingCRVEarned] = await Promise.all([
    call({ ctx, target: cvxRewardPool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: cvxRewardPool.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...(CVX as Balance),
    amount: balanceOf,
    rewards: [{ ...CRV, amount: pendingCRVEarned }],
    category: 'stake',
  }
}
