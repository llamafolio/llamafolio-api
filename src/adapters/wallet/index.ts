import type { Adapter, BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Chain } from '@lib/chains'
import { chainById, chains } from '@lib/chains'
import { getBalancesOf } from '@lib/erc20'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { chains as tokensByChain } from '@llamafolio/tokens'

async function getCoinBalance(ctx: BalancesContext, token?: Token) {
  if (!token) {
    return null
  }

  const provider = providers[ctx.chain]
  const amount = await provider.getBalance({
    address: ctx.address,
    blockNumber: ctx.blockHeight ? BigInt(ctx.blockHeight) : undefined,
  })
  return { ...token, amount }
}

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

  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
      // @ts-expect-error
      coin: getCoinBalance,
      erc20: getBalancesOf,
    })

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
