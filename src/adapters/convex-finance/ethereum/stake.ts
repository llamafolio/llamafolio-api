import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

import { getCvxCliffRatio } from './utils'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
}

export async function getCvxCrvStakeBalance(
  ctx: BalancesContext,
  cvxCrv: Contract,
  CVX: Contract,
  CRV: Contract,
): Promise<Balance> {
  const [balanceOfRes, crvEarnedRes, cvxTotalSupplyRes] = await Promise.all([
    call({
      ctx,
      target: cvxCrv.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),

    call({
      ctx,
      target: cvxCrv.address,
      params: [ctx.address],
      abi: abi.earned,
    }),

    call({
      ctx,
      target: CVX.address,
      abi: erc20Abi.totalSupply,
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output || '0')
  const crvEarned = BigNumber.from(crvEarnedRes.output || '0')
  const cvxTotalSupply = BigNumber.from(cvxTotalSupplyRes.output || '0')

  const rewards: Balance[] = []

  if (crvEarned.gt(0)) {
    const cvxEarned = getCvxCliffRatio(cvxTotalSupply, crvEarned)
    rewards.push({ ...CRV, amount: crvEarned } as Balance, { ...CVX, amount: cvxEarned } as Balance)
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

export async function getCVXStakeBalance(
  ctx: BalancesContext,
  cvxRewardPool: Contract,
  CVX: Contract,
  CRV: Contract,
): Promise<Balance> {
  const [balanceOfRes, earnedRes] = await Promise.all([
    call({
      ctx,
      target: cvxRewardPool.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),

    call({
      ctx,
      target: cvxRewardPool.address,
      params: [ctx.address],
      abi: abi.earned,
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const earned = BigNumber.from(earnedRes.output)

  return {
    chain: ctx.chain,
    address: CVX.address,
    symbol: CVX.symbol,
    decimals: CVX.decimals,
    amount: balanceOf,
    rewards: [{ ...CRV, amount: earned }],
    category: 'stake',
  }
}
