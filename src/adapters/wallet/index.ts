import { Adapter, Balance, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { chains as tokensByChain } from '@llamafolio/tokens'
import { ethers } from 'ethers'

async function getBalance(ctx: BaseContext, chain: Chain, token: Token) {
  try {
    const provider = providers[chain]
    const amount = await provider.getBalance(ctx.address, ctx.blockHeight?.[chain])
    const balance: Balance = {
      ...token,
      amount,
    }
    return balance
  } catch (err) {
    console.error(`Failed to get coin balance for chain ${chain}`, err)
    return null
  }
}

async function getTokensBalances(ctx: BaseContext, chain: Chain, tokens: Token[]) {
  const coin = tokens.find((token) => token.address === ethers.constants.AddressZero)
  const _tokens = tokens.filter((token) => token.address !== ethers.constants.AddressZero)

  if (coin) {
    return (await Promise.all([getBalance(ctx, chain, coin), getERC20BalanceOf(ctx, chain, _tokens)])).flat()
  }

  return getERC20BalanceOf(ctx, chain, _tokens)
}

const getContracts = () => {
  const contracts: { [key: string]: Token[] } = {}

  for (const chain in tokensByChain) {
    contracts[chain] = []

    for (const token of tokensByChain[chain]) {
      // llamafolio-tokens registers all tokens to help get metadata but some are protocol specific (ex: stETH, aTokens).
      // wallet flag indicates wallet-only tokens
      if (token.wallet) {
        contracts[chain].push({ ...token, chain } as Token)
      }
    }
  }

  return {
    contracts,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, chainContracts) => {
  const chainBalances = await Promise.all(
    Object.keys(chainContracts).map((chain) => getTokensBalances(ctx, chain as Chain, chainContracts[chain])),
  )

  return {
    balances: chainBalances
      .flat()
      .filter(isNotNullish)
      .map((balance) => {
        balance.category = 'wallet'
        return balance
      }),
  }
}

const adapter: Adapter = {
  id: 'wallet',
  getContracts,
  getBalances,
}

export default adapter
