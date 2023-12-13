import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'

const abi = {
  lockedStakesOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedStakesOf',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'kek_id', type: 'bytes32' },
          { internalType: 'uint256', name: 'start_timestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
          { internalType: 'uint256', name: 'ending_timestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'lock_multiplier', type: 'uint256' },
        ],
        internalType: 'struct FraxCrossChainFarmV3_ERC20.LockedStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const FXS: Contract = {
  chain: 'arbitrum',
  address: '0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7',
  decimals: 18,
  symbol: 'FXS',
}

const FRAX: Contract = {
  chain: 'arbitrum',
  address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
  decimals: 18,
  symbol: 'FRAX',
}

export async function getFraxArbLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const [userShares, [userRewards]] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address] as const, abi: abi.lockedStakesOf }),
    call({ ctx, target: locker.address, params: [ctx.address] as const, abi: abi.earned }),
  ])

  const lockedShareBalances = userShares.map((share, i) => {
    const { liquidity, ending_timestamp } = share
    const rewards = [{ ...FXS, amount: userRewards }]
    const unlockAt = Number(ending_timestamp)

    return {
      ...locker,
      amount: liquidity,
      unlockAt,
      rewards,
    }
  })

  const assetBalances = await multicall({
    ctx,
    calls: lockedShareBalances.map(
      (shareBalance) => ({ target: shareBalance.token!, params: [shareBalance.amount] }) as const,
    ),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(assetBalances, (res, index) => {
    const lockedBalance = lockedShareBalances[index]
    const now = Date.now() / 1000
    const underlyings = [{ ...FRAX, amount: res.output }]

    return {
      ...lockedBalance,
      underlyings,
      claimable: now > lockedBalance.unlockAt ? lockedBalance.amount : 0n,
      category: 'locked' as Category,
    }
  })
}
