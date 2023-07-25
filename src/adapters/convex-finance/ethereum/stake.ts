import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

import { getCvxCliffRatio } from './utils'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const threeCrv: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3CRV',
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
}

export async function getCvxCrvStakeBalance(ctx: BalancesContext, cvxCrv: Contract): Promise<Balance> {
  const [balanceOf, crvEarned, cvxTotalSupply, pending3CRVEarned] = await Promise.all([
    call({ ctx, target: cvxCrv.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: cvxCrv.address, params: [ctx.address], abi: abi.earned }),
    call({ ctx, target: CVX.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: cvxCrv.rewarder, params: [ctx.address], abi: abi.earned }),
  ])

  const rewards: Balance[] = []

  if (crvEarned > 0n) {
    const cvxEarned = getCvxCliffRatio(cvxTotalSupply, crvEarned)

    rewards.push({ ...CRV, amount: crvEarned } as Balance, { ...CVX, amount: cvxEarned } as Balance, {
      ...(threeCrv as Balance),
      amount: pending3CRVEarned,
    })
  }

  return {
    chain: ctx.chain,
    address: cvxCRV.address,
    symbol: cvxCRV.symbol,
    decimals: cvxCRV.decimals,
    amount: balanceOf,
    rewards,
    category: 'stake',
  }
}

export async function getCVXStakeBalance(ctx: BalancesContext, cvxRewardPool: Contract): Promise<Balance> {
  const [balanceOf, pendingCRVEarned] = await Promise.all([
    call({ ctx, target: cvxRewardPool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: cvxRewardPool.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    chain: ctx.chain,
    address: CVX.address,
    symbol: CVX.symbol,
    decimals: CVX.decimals,
    amount: balanceOf,
    rewards: [{ ...CRV, amount: pendingCRVEarned }],
    category: 'stake',
  }
}
