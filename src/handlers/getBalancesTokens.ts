// Get balances of all ERC20 tokens owned by an address.

import { badRequest, serverError, success } from '@handlers/response'
import { sortBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import { chainById, chainsNames } from '@lib/chains'
import { userBalancesWithRetry } from '@lib/erc20'
import { tokensBalancesWithPrices } from '@lib/price'
import { isFulfilled } from '@lib/promise'
import { isNotNullish } from '@lib/type'
import { chains as tokensPerChain } from '@llamafolio/tokens'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'

function formatBalance(balance: any): FormattedBalance {
  return {
    address: balance.address,
    name: balance.name,
    symbol: balance.symbol,
    decimals: balance.decimals,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
  }
}

export interface FormattedBalance {
  address: string
  name?: string
  symbol?: string
  decimals?: number
  price?: number
  amount?: string
  balanceUSD?: number
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
export async function balancesHandler({ address }: { address: Address }) {
  const promiseResult = await Promise.allSettled(
    chainsNames.map((chain) =>
      userBalancesWithRetry({
        address,
        chain,
        //@ts-ignore
        tokens: tokensPerChain[chain],
      }),
    ),
  )

  const fulfilledResults = (
    promiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      Awaited<ReturnType<typeof userBalancesWithRetry>>
    >[]
  ).map((result) => result.value)

  const withPrice = await Promise.all(
    fulfilledResults.map(async ({ chain, result }) => ({
      chain,
      result: await tokensBalancesWithPrices(result),
    })),
  )

  const now = new Date()

  const balancesResponse = {
    updatedAt: now.toISOString(),
    chains: withPrice.map(({ chain, result }) => ({
      id: chain as Chain,
      chainId: chainById[chain].chainId,
      balances: result.filter(isNotNullish).sort(sortBalances).map(formatBalance),
    })),
  }

  return balancesResponse
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address as `0x${string}` | undefined
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
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
