import walletAdapter from '@adapters/wallet'
import { getAllTokensInteractions, groupContracts } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { BalancesContext, PricedBalance } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { sanitizeBalances, sortBalances, sumBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import { Chain, chainById } from '@lib/chains'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyHandler } from 'aws-lambda'

function formatBalance(balance: any): FormattedBalance {
  return {
    address: balance.address,
    symbol: balance.symbol,
    decimals: balance.decimals,
    price: balance.price,
    amount: balance.amount,
    balanceUSD: balance.balanceUSD,
  }
}

export interface FormattedBalance {
  address: string
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

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  try {
    // Fetch all tokens received
    const tokens = await getAllTokensInteractions(client, address)

    const tokensByChain = groupBy(tokens, 'chain')

    const chains = Object.keys(tokensByChain)

    const chainsBalancesConfig = await Promise.all(
      chains
        .filter((chain) => walletAdapter[chain as Chain])
        .map(async (chain) => {
          const handler = walletAdapter[chain as Chain]!

          try {
            const hrstart = process.hrtime()

            const contracts = groupContracts(tokensByChain[chain]) || []

            const ctx: BalancesContext = { address, chain: chain as Chain, adapterId: walletAdapter.id }

            const balancesConfig = await handler.getBalances(ctx, contracts, {})

            const hrend = process.hrtime(hrstart)

            console.log(
              `[${walletAdapter.id}][${chain}] getBalances ${tokensByChain[chain].length} contracts, found ${balancesConfig.balances.length} balances in %ds %dms`,
              hrend[0],
              hrend[1] / 1000000,
            )

            return balancesConfig
          } catch (error) {
            console.error(`[${walletAdapter.id}][${chain}]: Failed to getBalances`, error)
            return
          }
        }),
    )

    const walletBalancesConfigs = chainsBalancesConfig.filter(isNotNullish)

    // Ungroup balances to make only 1 call to the price API
    const balances = walletBalancesConfigs.flatMap((balanceConfig) => balanceConfig?.balances).filter(isNotNullish)

    const sanitizedBalances = sanitizeBalances(balances)

    const hrstart = process.hrtime()

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    const hrend = process.hrtime(hrstart)

    console.log(
      `getPricedBalances ${sanitizedBalances.length} balances, found ${pricedBalances.length} balances in %ds %dms`,
      hrend[0],
      hrend[1] / 1000000,
    )

    const pricedBalancesByChain = groupBy(pricedBalances, 'chain')

    const now = new Date()

    const balancesResponse: BalancesErc20Response = {
      updatedAt: now.toISOString(),
      chains: Object.keys(pricedBalancesByChain)
        .map((chain) => {
          const chainInfo = chainById[chain]
          const balances = pricedBalancesByChain[chain] as PricedBalance[]

          return {
            id: chain as Chain,
            chainId: chainInfo.chainId,
            balances: balances.sort(sortBalances).map(formatBalance),
          }
        })
        .sort((a, b) => sumBalances(b.balances) - sumBalances(a.balances)),
    }

    return success(balancesResponse, { maxAge: 20 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}
