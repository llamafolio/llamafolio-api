import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_ZERO } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  lockedLiquidityOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedLiquidityOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256[]', name: 'new_earned', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getUnstEthFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const singleUnderlyingsBalances: Balance[] = []
  const multipleUnderlyingsBalances: Balance[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address, params: [ctx.address] }))

  const [balancesOfsRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lockedLiquidityOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  pools.forEach((pool, poolIdx) => {
    const rewards = pool.rewards as Balance[]
    const underlyings = pool.underlyings as Balance[]
    if (!underlyings || !rewards) {
      return
    }

    rewards.forEach((reward, idx) => {
      reward.amount =
        isSuccess(earnedsRes[poolIdx]) && earnedsRes[poolIdx].output.length > 0
          ? BigNumber.from(earnedsRes[poolIdx].output[idx])
          : BN_ZERO
    })

    const balance: Balance = {
      ...pool,
      address: pool.token as string,
      amount: isSuccess(balancesOfsRes[poolIdx]) ? BigNumber.from(balancesOfsRes[poolIdx].output) : BN_ZERO,
      rewards,
      underlyings,
      category: 'farm',
    }

    if (underlyings.length > 1) {
      multipleUnderlyingsBalances.push(balance)
    } else {
      singleUnderlyingsBalances.push(balance)
    }
  })

  const fmtUnderlyings = await getUnderlyingBalances(ctx, multipleUnderlyingsBalances)

  return [...singleUnderlyingsBalances, ...fmtUnderlyings]
}
