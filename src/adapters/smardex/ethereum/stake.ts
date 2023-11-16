import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  sharesToTokens: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'sharesToTokens',
    outputs: [{ internalType: 'uint256', name: 'tokens_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastBlockUpdate', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SDEX: Token = {
  chain: 'ethereum',
  address: '0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF',
  decimals: 18,
  symbol: 'SDEX',
}

export async function getSmarDexStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userInfosRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: abi.userInfo,
  })

  const sharesToTokens = await multicall({
    ctx,
    calls: mapSuccessFilter(userInfosRes, (res) => ({ target: res.input.target, params: [res.output[0]] }) as const),
    abi: abi.sharesToTokens,
  })

  return mapSuccessFilter(sharesToTokens, (res, index) => {
    const staker = stakers[index]

    return {
      ...staker,
      amount: res.output,
      underlyings: [SDEX],
      rewards: undefined,
      category: 'stake',
    }
  })
}
