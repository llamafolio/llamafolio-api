import { getUnderlyingsPoolsBalances } from '@adapters/curve/common/balance'
import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const underlyings = staker.underlyings as Contract[]

  const underlyingsBalances = await call({
    ctx,
    target: staker.address,
    params: [staker.amount.toString()],
    abi: abi.convertToAssets,
  })

  if (underlyings.length < 2) {
    return {
      ...staker,
      amount: staker.amount,
      underlyings: [{ ...underlyings[0], amount: BigNumber.from(underlyingsBalances.output) }],
      rewards: undefined,
      category: 'stake',
    }
  }

  return {
    ...staker,
    amount: BigNumber.from(underlyingsBalances.output),
    underlyings,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getStakeInPools(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances = (await Promise.all(stakers.map((staker) => getStakeBalances(ctx, staker)))).flat()

  return (await getUnderlyingsPoolsBalances(ctx, balances, metaRegistry, true)).map((pool) => ({
    ...pool,
    category: 'stake',
  }))
}

export async function getOldStaleInPools(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const underlyings = staker.underlyings as Contract[]

  const balance: Balance = {
    ...staker,
    amount: staker.amount,
    underlyings,
    rewards: undefined,
    category: 'stake',
  }

  return (await getUnderlyingsPoolsBalances(ctx, [balance], metaRegistry, true)).map((pool) => ({
    ...pool,
    category: 'stake',
  }))
}
