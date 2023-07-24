// Get balances of all ERC20 tokens owned by an address.

import { badRequest, serverError, success } from '@handlers/response'
import type { Chain } from '@lib/chains'
import { chainById, chainsNames } from '@lib/chains'
import { userBalances } from '@lib/erc20'
import { getPricedBalances } from '@lib/price'
import { isFulfilled } from '@lib/promise'
import { chains as tokensByChain } from '@llamafolio/tokens'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'
import { isAddress } from 'viem'

function formatBalance(balance: any): FormattedBalance {
  return {
    address: balance.address,
    name: balance.name,
    symbol: balance.symbol,
    decimals: balance.decimals,
    price: balance.price,
    amount: balance.amount.toString(),
    balanceUSD: balance.balanceUSD,
  }
}

export interface FormattedBalance {
  address: string
  name: string
  symbol: string
  decimals: number
  price: number
  amount: string
  balanceUSD: number
}

export interface BalancesErc20ChainResponse {
  id: Chain
  chainId: number
  balances: FormattedBalance[]
}

export interface BalancesErc20Response {
  updatedAt: string
  chains: BalancesErc20ChainResponse[]
}

// extracted so it can be used in tests
export async function balancesHandler({ address }: { address: Address }): Promise<BalancesErc20Response> {
  const promiseResult = await Promise.allSettled(
    chainsNames.map((chain) =>
      userBalances({
        chain,
        walletAddress: address,
        tokens: tokensByChain[chain],
      }),
    ),
  )

  const fulfilledResults = (
    promiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      Awaited<ReturnType<typeof userBalances>>
    >[]
  ).flatMap((item) => item.value)

  //@ts-expect-error
  const withPrice = await getPricedBalances(fulfilledResults)

  const chainsBalances = chainsNames.reduce(
    (accumulator, chain) => {
      accumulator[chain] = {
        id: chain as Chain,
        chainId: chainById[chain].chainId,
        balances: [],
      }
      return accumulator
    },
    {} as Record<Chain, BalancesErc20ChainResponse>,
  )

  for (const [, balance] of withPrice.entries()) {
    chainsBalances[balance.chain].balances.push(formatBalance(balance))
  }

  return {
    updatedAt: new Date().toISOString(),
    chains: Object.values(chainsBalances).filter((chain) => chain.balances.length > 0),
  }
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isAddress(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const balancesResponse = await balancesHandler({ address })

    return success(balancesResponse, { maxAge: 20 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    console.log('Balances request took', context.getRemainingTimeInMillis() / 1000, 'seconds')
  }
}
