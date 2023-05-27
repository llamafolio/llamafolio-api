import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserNthSlot: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint256', name: 'n', type: 'uint256' },
    ],
    name: 'getUserNthSlot',
    outputs: [
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockingStrategy', type: 'uint256' },
      { internalType: 'uint256', name: 'alreadyUnstaked', type: 'uint256' },
      { internalType: 'uint256', name: 'alreadyWithdrawn', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserSlotLength: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserSlotLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewarder: {
    inputs: [],
    name: 'rewarder',
    outputs: [{ internalType: 'contract IBaseRewardPoolLocker', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const VTX: Token = {
  chain: 'avalanche',
  address: '0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4',
  decimals: 18,
  symbol: 'VTX',
}

export async function getLockerBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const [userTotalDepositRes, rewarderAddressRes, userExtraLockedSlots] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.address, abi: abi.rewarder }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getUserSlotLength }),
  ])

  const userTotalDeposit = BigNumber.from(userTotalDepositRes)
  const rewarderAddress = rewarderAddressRes

  const rewards = await lockedRewardsBalances(ctx, rewarderAddress)

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount: userTotalDeposit,
    underlyings: [VTX as Balance],
    rewards,
    category: 'lock',
  })

  const extraUserLockedBySlotsRes = await multicall({
    ctx,
    calls: range(0, Number(userExtraLockedSlots)).map(
      (i) => ({ target: contract.address, params: [ctx.address, BigInt(i)] } as const),
    ),
    abi: abi.getUserNthSlot,
  })

  const extraUserLockedBySlots = mapSuccessFilter(extraUserLockedBySlotsRes, (res) => {
    const [_startTime, endTime, amount] = res.output
    if (amount === 0n) {
      return null
    }

    return { amount, endTime }
  })

  for (const extraUserLockedBySlot of extraUserLockedBySlots) {
    balances.push({
      chain: ctx.chain,
      address: contract.address,
      decimals: contract.decimals,
      symbol: contract.symbol,
      amount: BigNumber.from(extraUserLockedBySlot.amount),
      underlyings: [{ ...VTX, amount: BigNumber.from(extraUserLockedBySlot.amount) }],
      unlockAt: Number(extraUserLockedBySlot.endTime),
      category: 'lock',
    })
  }

  return balances
}

const lockedRewardsBalances = async (ctx: BalancesContext, rewarder: `0x${string}`): Promise<Balance[]> => {
  const pendingRewardsTokensRes = await multicall({
    ctx,
    // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts checked, 7 seems to be the maximum number of extra tokens used.
    calls: range(0, 7).map((i) => ({ target: rewarder, params: [BigInt(i)] } as const)),
    abi: abi.rewardTokens,
  })

  const pendingRewardsTokens = mapSuccessFilter(pendingRewardsTokensRes, (res) => res.output)
  const rewardsTokens = await getERC20Details(ctx, pendingRewardsTokens)

  const pendingRewardsBalancesRes = await multicall({
    ctx,
    calls: pendingRewardsTokens.map((token) => ({ target: rewarder, params: [ctx.address, token] } as const)),
    abi: abi.earned,
  })

  return mapSuccessFilter(pendingRewardsBalancesRes, (pendingRewardRes, idx) => ({
    ...rewardsTokens[idx],
    amount: BigNumber.from(pendingRewardRes.output),
  }))
}
