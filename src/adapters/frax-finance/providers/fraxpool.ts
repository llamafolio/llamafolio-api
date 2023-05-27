import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { utils } from 'ethers'

import type { ProviderBalancesParams } from './interface'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const fraxpoolProvider = async (_ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  for (const pool of pools) {
    pool.underlyings = ['0x853d955aCEf822Db058eb8505911ED77F175b99e']
  }

  return pools
}

export const fraxpoolBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const fmtBalancesOfRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: abi.pricePerShare,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const fmtBalanceOfRes = fmtBalancesOfRes[poolIdx]

    if (!fmtBalanceOfRes.success) {
      continue
    }

    pool.amount = pool.amount.mul(fmtBalanceOfRes.output).div(utils.parseEther('1.0'))
  }

  return pools
}
