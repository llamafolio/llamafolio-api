import type { Adapter, Balance, Contract, GetBalancesHandler } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { chainById, chains } from '@lib/chains'
import { userBalances } from '@lib/erc20'
import { chains as tokensByChain } from '@llamafolio/tokens'

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    const coin: Contract = { ...chainById[chain].nativeCurrency, chain, category: 'wallet' }
    const erc20: Contract[] = []

    for (const token of tokensByChain[chain]) {
      erc20.push({ ...token, chain, category: 'wallet' } as Contract)
    }

    return {
      contracts: { coin, erc20 },
    }
  }

  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, _contracts) => {
    // Note: use all balances from llamafolio-tokens directory instead of relying on Transfer interactions
    const tokenBalances = await userBalances({ chain, walletAddress: ctx.address, tokens: tokensByChain[chain] })
    const balances: Balance[] = tokenBalances.map((tokenBalance) => ({ ...tokenBalance, category: 'wallet' }))

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
