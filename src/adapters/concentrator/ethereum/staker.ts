import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const underlyings = staker.underlyings as Contract[]
  const balanceOf = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const underlyingsBalances = await call({
    ctx,
    target: staker.address,
    params: [balanceOf],
    abi: abi.convertToAssets,
  })

  if (underlyings.length < 2) {
    return {
      ...staker,
      amount: BigNumber.from(balanceOf),
      underlyings: [{ ...underlyings[0], amount: BigNumber.from(underlyingsBalances) }],
      rewards: undefined,
      category: 'stake',
    }
  }

  return {
    ...staker,
    amount: BigNumber.from(underlyingsBalances),
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
  const balanceOf = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balance: Balance = {
    ...staker,
    amount: BigNumber.from(balanceOf),
    underlyings,
    rewards: undefined,
    category: 'stake',
  }

  return (await getUnderlyingsPoolsBalances(ctx, [balance], metaRegistry, true)).map((pool) => ({
    ...pool,
    category: 'stake',
  }))
}
