import { client } from '@db/clickhouse'
import { selectHistory } from '@db/history'
import { badRequest, serverError, success } from '@handlers/response'
import type { BalancesContext, BaseContext } from '@lib/adapter'
import { chainByChainId, getRPCClient, type Chain } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { getTokenDetails } from '@lib/erc20'
import { parseAddresses, toDateTime, toStartOfMonth, toStartOfNextMonth, unixFromDateTime } from '@lib/fmt'
import { mulPrice } from '@lib/math'
import { getTokenKey, getTokenPrices } from '@lib/price'
import { sendSlackMessage } from '@lib/slack'
import type { Token } from '@lib/token'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface Transaction {
  chain: string
  blockNumber: string
  timestamp: number
  hash: string
  fromAddress: string
  toAddress: string
  gasUsed: string
  gasPrice: string
  inputFunctionName: string | undefined
  success: boolean
  adapterId?: string | null
  tokenTransfers: {
    name?: string
    symbol?: string
    decimals?: number
    tokenAddress: string
    fromAddress: string
    toAddress: string
    value: string
    price?: number
    valueUSD?: number
  }[]
  value: string
  price?: number
  valueUSD?: number
}

interface HistoryResponse {
  transactions: Transaction[]
  count: number
  next: number
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Invalid address parameter')
  }

  const queries = event.queryStringParameters

  let chains: string[] = []

  if (queries?.chains) {
    chains = queries.chains.replace(/"/g, '').replace(/'/g, '').split(',') ?? []
  }

  let protocols: string[] = []
  if (queries?.protocols) {
    protocols = queries.protocols.replace(/"/g, '').replace(/'/g, '').split(',') ?? []
  }

  const offset = parseInt(queries?.offset || '') || 0
  const limit = parseInt(queries?.limit || '') || 25

  const now = new Date()

  // 3 months
  const maxTimeRange = 60 * 60 * 24 * 3 * 31 * 1000

  const queryFromTimestamp = parseInt(queries?.from_ts || '0')
  const queryToTimestamp = parseInt(queries?.to_ts || '0')
  const fromTimestamp = queryFromTimestamp ? queryFromTimestamp * 1000 : toStartOfMonth(now).getTime()
  const toTimestamp = queryToTimestamp ? queryToTimestamp * 1000 : toStartOfNextMonth(now).getTime()

  if (toTimestamp - fromTimestamp > maxTimeRange) {
    return badRequest('Invalid time range parameters, window too large')
  }

  console.log({
    addresses,
    limit,
    offset,
    fromTimestamp: toDateTime(fromTimestamp),
    toTimestamp: toDateTime(toTimestamp),
    chains,
    protocols,
  })

  try {
    const transactionsData: Transaction[] = []
    let count = 0

    const transactions = await selectHistory(
      client,
      addresses,
      limit,
      offset,
      fromTimestamp,
      toTimestamp,
      chains,
      protocols,
    )

    for (const tx of transactions) {
      const chain = chainByChainId[parseInt(tx.chain)]?.id
      if (chain == null) {
        console.error(`Missing chain ${tx.chain}`)
        continue
      }

      count = parseInt(tx.count)

      transactionsData.push({
        chain,
        blockNumber: tx.block_number.toString(),
        timestamp: unixFromDateTime(tx.timestamp),
        hash: tx.hash,
        fromAddress: tx.from_address,
        toAddress: tx.to_address,
        gasUsed: tx.gas.toString(),
        gasPrice: tx.gas_price,
        inputFunctionName: tx.method_name,
        success: tx.status === 1,
        adapterId: tx.adapter_ids?.[0],
        value: tx.value,
        tokenTransfers: tx.token_transfers.map(
          ([fromAddress, toAddress, tokenAddress, _log_index, _type, value, _id]) => ({
            tokenAddress,
            fromAddress,
            toAddress,
            value,
          }),
        ),
      })
    }

    // 1. collect tokens / coins
    // 2. fetch their prices + details
    // 3. attach prices + details to tokens / coins
    const tokensByChain: { [chain: string]: string[] } = {}
    const tokensInfoByChainAddress: { [chain: string]: { [address: string]: Token } } = {}

    for (const transaction of transactionsData) {
      // gas price
      if (!tokensByChain[transaction.chain]) {
        tokensByChain[transaction.chain] = []
      }
      tokensByChain[transaction.chain].push(ADDRESS_ZERO)

      // token transfers
      if (transaction.tokenTransfers) {
        for (const transfer of transaction.tokenTransfers) {
          if (!tokensByChain[transaction.chain]) {
            tokensByChain[transaction.chain] = []
          }
          tokensByChain[transaction.chain].push(transfer.tokenAddress)
        }
      }
    }

    const tokens = Object.keys(tokensByChain).flatMap((chain) =>
      tokensByChain[chain].map((address) => ({ chain, address }) as Token),
    )

    // Fetch tokens info
    await Promise.all(
      Object.keys(tokensByChain).map(async (chain) => {
        const ctx: BaseContext = {
          chain: chain as Chain,
          adapterId: '',
          client: getRPCClient({ chain: chain as Chain }),
        }
        const tokens = await getTokenDetails(ctx, tokensByChain[chain] as `0x${string}`[])

        for (const token of tokens) {
          if (!tokensInfoByChainAddress[chain]) {
            tokensInfoByChainAddress[chain] = {}
          }

          tokensInfoByChainAddress[chain][token.address] = token
        }
      }),
    )

    if (tokens.length > 0) {
      const prices = await getTokenPrices(tokens)

      for (const transaction of transactionsData) {
        const chain = transaction.chain as Chain

        // gas cost
        const gasKey = getTokenKey({ chain, address: ADDRESS_ZERO })
        if (gasKey) {
          const priceInfo = prices.coins[gasKey]
          if (priceInfo) {
            transaction.price = priceInfo.price
          }
        }

        // gas transfer
        if (transaction.value !== '0' && transaction.price) {
          transaction.valueUSD = mulPrice(BigInt(transaction.value || 0), 18, transaction.price)
        }

        // token transfers
        if (transaction.tokenTransfers) {
          for (const transfer of transaction.tokenTransfers) {
            // info
            const tokenInfo = tokensInfoByChainAddress[transaction.chain][transfer.tokenAddress]
            if (tokenInfo) {
              transfer.decimals = tokenInfo.decimals
              transfer.symbol = tokenInfo.symbol
              transfer.name = tokenInfo.name
            }

            // price
            const key = getTokenKey({ chain, address: transfer.tokenAddress })
            if (key) {
              const priceInfo = prices.coins[key]
              if (priceInfo && priceInfo.decimals) {
                transfer.price = priceInfo.price
                transfer.valueUSD = mulPrice(BigInt(transfer.value || 0), priceInfo.decimals, priceInfo.price)
              }
            }
          }
        }
      }
    }

    const response: HistoryResponse = {
      transactions: transactionsData,
      count,
      next: Math.min(offset + limit, count),
    }

    return success(response, { maxAge: 5 * 60 })
  } catch (error) {
    console.error('Failed to retrieve history', error)

    await Promise.all(
      addresses.map(async (address) => {
        const balancesContext: BalancesContext = {
          chain: 'ethereum',
          adapterId: '',
          client: getRPCClient({ chain: 'ethereum' }),
          address,
        }

        await sendSlackMessage(balancesContext, {
          level: 'error',
          title: 'Failed to retrieve history',
          message: (error as any).message,
        })
      }),
    )

    return serverError('Failed to retrieve history')
  }
}
