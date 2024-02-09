import type { Adapter, Balance, Contract, GetBalancesHandler } from '@lib/adapter'
import { getCoinBalance } from '@lib/balance'
import type { Chain } from '@lib/chains'
import { chainById, chains } from '@lib/chains'
import { getBalancesOf } from '@lib/erc20'
import { chains as tokensByChain } from '@llamafolio/tokens'

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    const coin: Contract = { ...chainById[chain].nativeCurrency, chain, category: 'wallet' }
    const erc20: Contract[] = (tokensByChain[chain] || []).map(
      (token) => ({ ...token, chain, category: 'wallet' }) as Contract,
    )

    return {
      contracts: { coin, erc20 },
    }
  }

  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    // Note: use all balances from llamafolio-tokens directory instead of relying on Transfer interactions
    const tokens = ((chainById[chain]?.indexed ? contracts.erc20 : tokensByChain[chain]) || []) as Contract[]

    const [coinBalance, erc20Balances] = await Promise.all([getCoinBalance(ctx), getBalancesOf(ctx, tokens)])

    const balances: Balance[] = [coinBalance, ...erc20Balances].map((tokenBalance) => ({
      ...tokenBalance,
      category: 'wallet',
    }))

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
  adapter[chain.id] = getChainHandlers(chain.id)
}

export default adapter
