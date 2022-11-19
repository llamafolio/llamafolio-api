import { Balance, BaseBalance, BaseContext, BaseContract, GetContractsHandler } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { Call, multicall, MultiCallResult } from '@lib/multicall'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { ethers } from 'ethers'

export async function getBalances(ctx: BaseContext, contracts: BaseContract[]) {
  const coins: Token[] = []
  const tokensByChain: { [key: string]: Token[] } = {}

  for (const token of contracts) {
    // native chain coin
    if (token.address === ethers.constants.AddressZero) {
      coins.push(token as Token)
      continue
    }

    // token
    if (!tokensByChain[token.chain]) {
      tokensByChain[token.chain] = []
    }
    tokensByChain[token.chain]?.push(token as Token)
  }

  const coinsBalances = (
    await Promise.all(
      coins.map(async (token) => {
        try {
          const provider = providers[token.chain]
          const balance = await provider.getBalance(ctx.address)
          ;(token as BaseBalance).amount = balance
          return token
        } catch (err) {
          console.error(`Failed to get coin balance for chain ${token.chain}`, err)
          return null
        }
      }),
    )
  ).filter(isNotNullish)

  const tokensBalances: Token[] = (
    await Promise.all(
      Object.keys(tokensByChain).map((chain) => getERC20BalanceOf(ctx, chain as Chain, tokensByChain[chain])),
    )
  ).flat() as Token[]

  return coinsBalances.concat(tokensBalances)
}

export async function getBalancesCalls(chain: Chain, calls: Call[]) {
  const coinsCallsAddresses: string[] = []
  const tokensCalls: Call[] = []
  const res: MultiCallResult[] = []

  for (const call of calls) {
    if (call.target === ethers.constants.AddressZero) {
      // native chain coin
      // @ts-ignore
      coinsCallsAddresses.push(call.params[0])
    } else {
      // token
      tokensCalls.push(call)
    }
  }

  const coinsBalancesRes = await Promise.all(
    coinsCallsAddresses.map(async (address) => {
      try {
        const provider = providers[chain]
        const balance = await provider.getBalance(address)
        return balance
      } catch (err) {
        console.error(`Failed to get coin balance for chain ${chain}`, err)
        return null
      }
    }),
  )

  const tokensBalancesRes = await multicall({
    chain,
    calls: tokensCalls,
    abi: erc20Abi.balanceOf,
  })

  let coinIdx = 0
  let tokenIdx = 0
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]

    if (call.target === ethers.constants.AddressZero) {
      // native chain coin
      res.push({
        success: coinsBalancesRes[coinIdx] != null,
        // @ts-ignore
        input: call,
        output: coinsBalancesRes[coinIdx]?.toString(),
      })
      coinIdx++
    } else {
      // token
      res.push(tokensBalancesRes[tokenIdx])
      tokenIdx++
    }
  }

  return res
}

export function sanitizeBalances(balances: Balance[]) {
  const sanitizedBalances = balances.filter((balance) => {
    if (!balance.amount) {
      console.error(`Missing balance amount`, balance)
      return false
    }

    if (balance.underlyings) {
      // if there's 1 underlying and the amount is not defined, use the balance amount as default
      if (balance.underlyings.length === 1 && balance.underlyings[0].amount == null) {
        balance.underlyings[0].amount = balance.amount
      }

      for (const underlying of balance.underlyings) {
        if (underlying.amount == null) {
          console.error('Nullish underlying balance amount', { balance, underlying })
          underlying.amount = BN_ZERO
        }
      }
    }

    if (balance.rewards) {
      for (const reward of balance.rewards) {
        if (reward.amount == null) {
          console.error('Nullish reward balance amount', { balance, reward })
          reward.amount = BN_ZERO
        }
      }
    }

    return true
  })

  return sanitizedBalances
}

export async function resolveBalances<C extends GetContractsHandler>(
  ctx: BaseContext,
  chain: Chain,
  contracts: Partial<Awaited<ReturnType<C>>['contracts']>,
  resolvers: {
    [key in keyof Partial<Awaited<ReturnType<C>>['contracts']>]: (
      ctx: BaseContext,
      chain: Chain,
      contracts: Awaited<ReturnType<C>>['contracts'][key],
    ) =>
      | Promise<Balance | Balance[] | Balance[][] | null | undefined>
      | Balance
      | Balance[]
      | Balance[][]
      | null
      | undefined
  },
) {
  const contractKeys = Object.keys(contracts)
  const balances = await Promise.all(
    contractKeys
      .filter((contractKey) => resolvers[contractKey] != null && contracts[contractKey] != null)
      .map((contractKey) => resolvers[contractKey](ctx, chain, contracts[contractKey]!)),
  )
  return balances.flat(2).filter(isNotNullish)
}
