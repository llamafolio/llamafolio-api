import type { Adapter, Balance, BalancesContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { evmClient } from '@lib/provider/provider'
import type { Token } from '@lib/token'
import { chains as tokensByChain } from '@llamafolio/tokens'
import { getAddress } from 'viem'

async function getCoinBalance(ctx: BalancesContext, token?: Token) {
  if (!token) {
    return null
  }

  // const provider = providers[ctx.chain]
  const provider = evmClient(ctx.chain)
  // const amount = await provider.getBalance(ctx.address, ctx.blockHeight)
  const amount = await provider.getBalance({
    address: getAddress(ctx.address),
    blockNumber: ctx.blockHeight ? BigInt(ctx.blockHeight) : undefined,
  })

  // @ts-ignore
  return { ...token, amount } as Balance
}

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    let coin: Token | undefined = undefined
    const erc20: Token[] = []

    for (const token of tokensByChain[chain]) {
      if (token.address === '0x0000000000000000000000000000000000000000') {
        // @ts-ignore
        coin = { ...token, chain, category: 'wallet' } as Token
        continue
      }
      // llamafolio-tokens registers all tokens to help get metadata but some are protocol specific (ex: stETH, aTokens).
      // wallet flag indicates wallet-only tokens
      if (token.wallet) {
        // @ts-ignore
        erc20.push({ ...token, chain, category: 'wallet' } as Token)
      }
    }

    return {
      contracts: { coin, erc20 },
    }
  }
  // @ts-ignore
  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    // @ts-ignore
    const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
      coin: getCoinBalance,
      erc20: getERC20BalanceOf,
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
  // @ts-ignore
  adapter[chain.id] = getChainHandlers(chain.id)
}

export default adapter
