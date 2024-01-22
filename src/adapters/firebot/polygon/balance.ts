import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  userInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfos',
    outputs: [
      { internalType: 'uint256', name: 'stakedEP', type: 'uint256' },
      { internalType: 'uint256', name: 'lastClaim', type: 'uint256' },
      { internalType: 'uint256', name: 'amountClaimed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      { internalType: 'uint256', name: 'totalRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'teamRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'userRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  reserveEP: {
    inputs: [],
    name: 'reserveEP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  reserveFBX: {
    inputs: [],
    name: 'reserveFBX',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  withdrawalRate: {
    inputs: [],
    name: 'withdrawalRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputResponse {
  output: bigint
}

const FBX: Contract = {
  chain: 'polygon',
  address: '0xd125443f38a69d776177c2b9c041f462936f8218',
  decimals: 18,
  symbol: 'FBX',
}

export async function getFireBotStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfos }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  return {
    ...staker,
    amount: userBalance[0],
    underlyings: undefined,
    rewards: [{ ...FBX, amount: userReward[2] }],
    category: 'stake',
  }
}

export async function getFireBotLPBalance(ctx: BalancesContext, lp: Contract): Promise<Balance> {
  const underlyings = lp.underlyings as Contract[]

  const [userBalance, tokenSupply, reservet0, reservet1] = await Promise.all([
    call({ ctx, target: lp.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: lp.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: lp.address, abi: abi.reserveEP }),
    call({ ctx, target: lp.address, abi: abi.reserveFBX }),
  ])

  underlyings.forEach((underlying, index) => {
    const reserves = [reservet0, reservet1]
    underlying.amount = (userBalance * reserves[index]) / tokenSupply
  })

  return {
    ...lp,
    amount: userBalance,
    underlyings,
    rewards: undefined,
    category: 'lp',
  }
}

export async function getFireBotFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const [userBalances, rates] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: abi.withdrawalRate,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], rates[i]]),

    (res, index) => {
      const farmer = farmers[index]
      const rawUnderlying = farmer.underlyings![0] as Contract
      const [{ output: amount }, { output: pricePerShare }] = res.inputOutputPairs as OutputResponse[]

      return {
        ...farmer,
        amount,
        underlyings: [{ ...rawUnderlying, amount: (amount * pricePerShare) / parseEther('1.0') }],
        rewards: undefined,
        category: 'farm',
      }
    },
  )
}
