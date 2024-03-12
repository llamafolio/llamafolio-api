import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'

const abi = {
  getMarkets: {
    inputs: [
      { internalType: 'contract DataStore', name: 'dataStore', type: 'address' },
      { internalType: 'uint256', name: 'start', type: 'uint256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    name: 'getMarkets',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'marketToken', type: 'address' },
          { internalType: 'address', name: 'indexToken', type: 'address' },
          { internalType: 'address', name: 'longToken', type: 'address' },
          { internalType: 'address', name: 'shortToken', type: 'address' },
        ],
        internalType: 'struct Market.Props[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function readGMXMarkets(
  ctx: BaseContext,
  reader: Contract,
  dataStore: Contract,
  exchangeRouter: Contract,
): Promise<Contract> {
  const marketTokens: `0x${string}`[] = []
  const rawLongTokens: `0x${string}`[] = []
  const rawShortTokens: `0x${string}`[] = []

  const marketsInfos = await call({
    ctx,
    target: reader.address,
    params: [dataStore.address, 0n, 20n],
    abi: abi.getMarkets,
  })

  marketsInfos.map(({ marketToken, longToken, shortToken }) => {
    marketTokens.push(marketToken)
    rawLongTokens.push(longToken)
    rawShortTokens.push(shortToken)
  })

  const [longTokens, shortTokens] = await Promise.all([
    getERC20Details(ctx, rawLongTokens),
    getERC20Details(ctx, rawShortTokens),
  ])

  const markets: Contract[] = marketTokens.map((market, index) => {
    return { chain: ctx.chain, address: market, longToken: longTokens[index], shortToken: shortTokens[index] }
  })

  return { ...exchangeRouter, markets }
}
