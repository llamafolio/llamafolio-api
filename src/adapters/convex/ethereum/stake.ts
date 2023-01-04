import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

import { getCRVCVXRewards } from './rewards'

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
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

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [getBalanceOf, getRewards] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),

    getCRVCVXRewards(ctx, contract),
  ])

  const balanceOf = BigNumber.from(getBalanceOf.output)

  balances.push({
    chain: ctx.chain,
    address: cvxCRV.address,
    symbol: cvxCRV.symbol,
    decimals: cvxCRV.decimals,
    amount: balanceOf,
    rewards: getRewards,
    category: 'stake',
  })

  return balances
}

export async function getCVXStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfRes, earnedRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),

    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.earned,
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const earned = BigNumber.from(earnedRes.output)

  balances.push({
    chain: ctx.chain,
    address: CVX.address,
    symbol: CVX.symbol,
    decimals: CVX.decimals,
    amount: balanceOf,
    rewards: [{ ...CRV, amount: earned }],
    category: 'stake',
  })

  return balances
}
