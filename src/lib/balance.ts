import { Chain, providers } from '@defillama/sdk/build/general'
import { BaseBalance, BaseContext, BaseContract } from '@lib/adapter'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import { Call, multicall, MultiCallResult } from '@lib/multicall'
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

  const tokensBalances = (
    await Promise.all(
      Object.keys(tokensByChain).map((chain) => getERC20BalanceOf(ctx, chain as Chain, tokensByChain[chain])),
    )
  ).flat()

  return coinsBalances.concat(tokensBalances)
}

export async function getBalancesCalls(chain: Chain, calls: Call[]) {
  const coinsCallsAddresses: string[] = []
  const tokensCalls: Call[] = []
  const res: MultiCallResult[] = []

  for (const call of calls) {
    if (call.target === ethers.constants.AddressZero) {
      // native chain coin
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
        input: calls[i],
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
