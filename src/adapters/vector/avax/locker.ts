import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const VTX: Token = {
  chain: 'avax',
  address: '0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4',
  decimals: 18,
  symbol: 'VTX',
}

export async function getLockerBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const [userTotalDepositRes, rewarderAddressRes, userExtraLockedSlots] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'rewarder',
        outputs: [{ internalType: 'contract IBaseRewardPoolLocker', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
        name: 'getUserSlotLength',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const userTotalDeposit = BigNumber.from(userTotalDepositRes.output)
  const rewarderAddress = rewarderAddressRes.output

  const rewards = await lockedRewardsBalances(ctx, chain, rewarderAddress)

  balances.push({
    chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount: userTotalDeposit,
    underlyings: [VTX as Balance],
    rewards,
    category: 'lock',
  })

  const extraUserLockedBySlotsRes = await multicall({
    chain,
    calls: range(0, userExtraLockedSlots.output).map((i) => ({
      target: contract.address,
      params: [ctx.address, i],
    })),
    abi: {
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
  })

  const extraUserLockedBySlots = extraUserLockedBySlotsRes
    .filter((res) => res.success)
    .map((res) => ({ amount: BigNumber.from(res.output.amount), endTime: res.output.endTime }))
    .filter((res) => res.amount.gt(0))

  for (const extraUserLockedBySlot of extraUserLockedBySlots) {
    balances.push({
      chain,
      address: contract.address,
      decimals: contract.decimals,
      symbol: contract.symbol,
      amount: extraUserLockedBySlot.amount,
      underlyings: [{ ...VTX, amount: extraUserLockedBySlot.amount }],
      lock: { end: extraUserLockedBySlot.endTime },
      category: 'lock',
    })
  }

  return balances
}

const lockedRewardsBalances = async (ctx: BaseContext, chain: Chain, rewarder: string): Promise<Balance[]> => {
  const pendingRewardsTokensRes = await multicall({
    chain,
    // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts checked, 7 seems to be the maximum number of extra tokens used.
    calls: range(0, 7).map((i) => ({
      target: rewarder,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'rewardTokens',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingRewardsTokens = pendingRewardsTokensRes.filter((res) => res.success).map((res) => res.output)
  const rewardsTokens = await getERC20Details(chain, pendingRewardsTokens)

  const pendingRewardsBalancesRes = await multicall({
    chain,
    calls: pendingRewardsTokens.map((token) => ({
      target: rewarder,
      params: [ctx.address, token],
    })),
    abi: {
      inputs: [
        { internalType: 'address', name: '_account', type: 'address' },
        { internalType: 'address', name: '_rewardToken', type: 'address' },
      ],
      name: 'earned',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })
  const pendingRewardsBalances = pendingRewardsBalancesRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output))

  return rewardsTokens.map((token, i) => ({ ...token, amount: pendingRewardsBalances[i] }))
}
