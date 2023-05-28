import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakerBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = []
  for (const staker of stakers) {
    calls.push({ target: staker.address, params: [ctx.address] })
  }
  const balanceOfsRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

  const balanceOfAssetsRes = await multicall({
    ctx,
    calls: stakers.map((staker, idx) => {
      const balanceOfRes = balanceOfsRes[idx]
      return {
        target: staker.address,
        params: [balanceOfRes.success ? balanceOfRes.output : 0n],
      } as const
    }),
    abi: abi.convertToAssets,
  })

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const underlying = staker.underlyings?.[0] as Contract
    const balanceOfAssetRes = balanceOfAssetsRes[idx]

    if (!balanceOfAssetRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: BigNumber.from(balanceOfAssetRes.input.params[0]),
      underlyings: [{ ...underlying, amount: BigNumber.from(balanceOfAssetRes.output) }],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

export async function getPoolStakingBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balanceOfsRes = await call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const balanceOfAssetsRes = await call({
    ctx,
    target: contract.address,
    params: [balanceOfsRes],
    abi: abi.convertToAssets,
  })

  const balance: Balance = {
    ...contract,
    amount: BigNumber.from(balanceOfAssetsRes),
    underlyings: contract.underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }

  return (await getUnderlyingsPoolsBalances(ctx, [balance], undefined, true)).map((res) => ({
    ...res,
    category: 'stake',
  }))
}
