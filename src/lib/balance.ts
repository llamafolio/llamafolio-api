import { Balance, BaseBalance, BaseContext, BaseContract, GetContractsHandler } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { Call, multicall, MultiCallParams, MultiCallResult } from '@lib/multicall'
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

export async function multicallBalances(params: MultiCallParams) {
  if (!params.chain) {
    return []
  }

  const chain = params.chain as Chain
  const coinsCallsAddresses: string[] = []
  const tokensCalls: Call[] = []
  const res: MultiCallResult[] = []

  for (const call of params.calls) {
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
    abi: params.abi,
  })

  let coinIdx = 0
  let tokenIdx = 0
  for (let i = 0; i < params.calls.length; i++) {
    const call = params.calls[i]

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
      let defaultAmount = BN_ZERO
      if (balance.underlyings.length === 1 && balance.underlyings[0].amount == null) {
        defaultAmount = balance.amount
      }

      balance.underlyings = balance.underlyings.map((underlying) => ({
        ...underlying,
        amount: underlying.amount || defaultAmount,
      }))
    }

    if (balance.rewards) {
      balance.rewards = balance.rewards.map((reward) => ({
        ...reward,
        amount: reward.amount || BN_ZERO,
      }))
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
      .map(async (contractKey) => {
        try {
          const resolver = resolvers[contractKey]
          const balances = await resolver(ctx, chain, contracts[contractKey]!)
          return balances
        } catch (error) {
          console.error(`Resolver ${contractKey} failed`, error)
          return null
        }
      }),
  )
  return balances.flat(2).filter(isNotNullish)
}
