import type { BalancesContext, Contract } from '@lib/adapter'
import type { Balance } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  calculateSharesValueInLOOKS: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'calculateSharesValueInLOOKS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  calculatePendingRewards: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'calculatePendingRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const LOOKS: Contract = {
  name: 'LooksRare Token',
  chain: 'ethereum',
  address: '0xf4d2888d29D722226FafA5d9B24F9164c092421E',
  decimals: 18,
  symbols: 'LOOKS',
}

const WETH: Contract = {
  name: 'Wrapped Ether',
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbols: 'WETH',
}

export const getStakeBalances = async (ctx: BalancesContext, stakingContract: Contract): Promise<Balance> => {
  const [stakeBalanceOfRes, rewardsBalanceOfRes] = await Promise.all([
    call({
      ctx,
      target: stakingContract.address,
      params: ctx.address,
      abi: abi.calculateSharesValueInLOOKS,
    }),

    call({
      ctx,
      target: stakingContract.address,
      params: ctx.address,
      abi: abi.calculatePendingRewards,
    }),
  ])

  return {
    chain: ctx.chain,
    address: LOOKS.address,
    decimals: LOOKS.decimals,
    symbol: LOOKS.symbols,
    amount: BigNumber.from(stakeBalanceOfRes.output),
    rewards: [{ ...WETH, amount: BigNumber.from(rewardsBalanceOfRes.output) }],
    category: 'stake',
  }
}

export const getCompounderBalances = async (ctx: BalancesContext, compounder: Contract): Promise<Balance> => {
  const sharesValue = await call({
    ctx,
    target: compounder.address,
    params: [ctx.address],
    abi: abi.calculateSharesValueInLOOKS,
  })

  return {
    chain: ctx.chain,
    address: LOOKS.address,
    decimals: LOOKS.decimals,
    symbol: LOOKS.symbols,
    amount: BigNumber.from(sharesValue.output),
    yieldKey: compounder.address,
    category: 'farm',
  }
}

export const getFarmBalances = async (ctx: BalancesContext, farmer: Contract): Promise<Balance[]> => {
  const [{ output: balanceOfRes }, { output: earnedOfRes }] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.calculatePendingRewards }),
  ])

  const balance: Balance = {
    ...farmer,
    address: farmer.token as string,
    amount: BigNumber.from(balanceOfRes.amount),
    underlyings: farmer.underlyings as Contract[],
    rewards: [{ ...LOOKS, amount: BigNumber.from(earnedOfRes) }],
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [balance])
}
