import { Adapter, Balance, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain, chains } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { chains as tokensByChain } from '@llamafolio/tokens'
import { ethers } from 'ethers'

async function getCoinBalance(ctx: BaseContext, chain: Chain, token?: Token) {
  if (!token) {
    return null
  }

  const provider = providers[chain]
  const amount = await provider.getBalance(ctx.address, ctx.blockHeight?.[chain])
  return { ...token, amount } as Balance
}

const getChainHandlers = (chain: Chain) => {
  const getContracts = () => {
    let coin: Token | undefined = undefined
    const erc20: Token[] = []

    for (const token of tokensByChain[chain]) {
      if (token.address === ethers.constants.AddressZero) {
        coin = { ...token, chain, category: 'wallet' } as Token
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

  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    const balances = await resolveBalances<typeof getContracts>(ctx, chain, contracts, {
      coin: getCoinBalance,
      erc20: getERC20BalanceOf,
    })

    return {
      balances,
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
