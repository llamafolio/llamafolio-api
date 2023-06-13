import type { Adapter, BalancesContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'
import { chains as tokensByChain, getToken } from '@llamafolio/tokens'

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    let coin: Token | undefined
    const erc20: Token[] = []

    for (const token of tokensByChain[chain]) {
      if (token.address === ADDRESS_ZERO) {
        //@ts-expect-error
        coin = { ...token, chain, category: 'wallet' }
        continue
      }
      // llamafolio-tokens registers all tokens to help get metadata but some are protocol specific (ex: stETH, aTokens).
      // wallet flag indicates wallet-only tokens
      if (token.wallet) {
        //@ts-expect-error
        erc20.push({ ...token, chain, category: 'wallet' } as Token)
      }
    }

    return {
      contracts: { coin, erc20 },
    }
  }

  //@ts-expect-error
  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    //@ts-expect-error
    const balances = await getBalancesOf(ctx, contracts.erc20 as Token[])
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
