import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner_', type: 'address' },
      { internalType: 'uint256', name: 'index_', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenURI: {
    inputs: [{ internalType: 'uint256', name: 'tokenId_', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSolvFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userTokensLengths = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const userTokensIds = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensLengths, (res) => {
      return rangeBI(0n, res.output).map((i) => {
        return { target: res.input.target, params: [ctx.address, i] } as const
      })
    }).flat(),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenURIsRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensIds, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.tokenURI,
  })

  const rawTokens: Balance[] = mapSuccessFilter(tokenURIsRes, (response) => {
    const base64_string = response.output.replace('data:application/json;base64,', '')
    const tokenInfos = JSON.parse(atob(base64_string))

    const { properties, balance } = tokenInfos
    const { currency, maturity } = properties

    return {
      chain: ctx.chain,
      address: currency,
      amount: BigInt(balance),
      decimals: 18,
      unlockAt: maturity,
      category: 'farm',
    }
  })

  const symbolRes = await multicall({
    ctx,
    calls: rawTokens.map((token) => ({ target: token.address })),
    abi: erc20Abi.symbol,
  })

  return mapSuccessFilter(symbolRes, (res, index) => ({ ...rawTokens[index], symbol: res.output }))
}
