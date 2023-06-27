import type { Adapter, GetBalancesHandler } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { userBalancesWithRetry } from '@lib/erc20'
import type { Token } from '@lib/token'
import { chains as tokensByChain } from '@llamafolio/tokens'

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    let coin: Token | undefined
    const erc20: Token[] = []

    for (const token of tokensByChain[chain]) {
      // @ts-ignore
      if (token.native) {
        // @ts-expect-error
        coin = { ...token, chain, category: 'wallet' }
        continue
      }
      // llamafolio-tokens registers all tokens to help get metadata but some are protocol specific (ex: stETH, aTokens).
      // wallet flag indicates wallet-only tokens
      if (token.wallet) {
        erc20.push({ ...token, chain, category: 'wallet' } as Token)
      }
    }

    return {
      contracts: { coin, erc20 },
    }
  }

  // @ts-ignore TODO: fix this
  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, _contracts) => {
    const [coin, ...erc20] = await userBalancesWithRetry({
      chain: ctx.chain,
      address: ctx.address,
      //@ts-ignore TODO: fix this
      tokens: tokensByChain[ctx.chain],
    })
    const balances = [coin, ...erc20]
    return {
      groups: [{ balances }],
    }
  }

  return {
    getContracts,
    getBalances,
  }
}

const adapter: Adapter = {
  id: 'wallet',
}

for (const chain of chains) {
  //@ts-expect-error
  adapter[chain.id] = getChainHandlers(chain.id)
}

export default adapter
