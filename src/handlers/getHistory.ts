import { client } from '@db/clickhouse'
import { selectHistory } from '@db/history'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { type Chain, chainByChainId } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { toNextDay, toStartOfDay, unixFromDateTime } from '@lib/fmt'
import { mulPrice } from '@lib/math'
import { getTokenKey, getTokenPrices } from '@lib/price'
import type { Token } from '@lib/token'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface ITransaction {
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

interface IHistory {
  transactions: ITransaction[]
  count: number
  next: number
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const address = event.pathParameters?.address?.toLowerCase()

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
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

  const now = Date.now()

  // 3 months
  const maxTimeRange = 60 * 60 * 24 * 3 * 31 * 1000

  const queryFromTimestamp = parseInt(queries?.from_ts || '0')
  const queryToTimestamp = parseInt(queries?.to_ts || '0')
  const fromTimestamp = queryFromTimestamp ? queryFromTimestamp * 1000 : now - maxTimeRange
  const toTimestamp = queryToTimestamp ? queryToTimestamp * 1000 : now

  if (toTimestamp - fromTimestamp > maxTimeRange) {
    return badRequest('Invalid time range parameters, window too large')
  }

  console.log({
    address,
    limit,
    offset,
    fromTimestamp: toStartOfDay(new Date(fromTimestamp)),
    toTimestamp: toStartOfDay(toNextDay(new Date(toTimestamp))),
    chains,
    protocols,
  })

  try {
    const transactionsData: ITransaction[] = []
    let count = 0

    const transactions = await selectHistory(
      client,
      address,
      limit,
      offset,
      toStartOfDay(new Date(fromTimestamp)),
      toStartOfDay(toNextDay(new Date(toTimestamp))),
      chains,
      protocols,
    )

    for (const tx of transactions) {
      const chain = chainByChainId[parseInt(tx.chain)]?.id
      if (chain == null) {
        console.error(`Missing chain ${tx.chain}`)
        continue
      }

      count = parseInt(tx.total)

      transactionsData.push({
        chain,
        blockNumber: tx.block_number.toString(),
        timestamp: unixFromDateTime(tx.timestamp),
        hash: tx.hash,
        fromAddress: tx.from,
        toAddress: tx.to,
        gasUsed: tx.gas.toString(),
        gasPrice: tx.gas_price,
        inputFunctionName: tx.method_name,
        success: tx.status === 'success',
        adapterId: tx.adapter_ids?.[0],
        value: tx.value,
        tokenTransfers: tx.token_transfers.map(
          ([from, to, address, _log_index, _type, value, _id, decimals, symbol, name]) => ({
            name,
            symbol,
            decimals,
            tokenAddress: address,
            fromAddress: from,
            toAddress: to,
            value: value,
          }),
        ),
      })
    }

    // 1. collect tokens / coins
    // 2. fetch their prices
    // 3. attach prices to tokens / coins
    const tokensByChain: { [chain: string]: string[] } = {}

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
          transaction.valueUSD = mulPrice(BigInt(transaction.value), 18, transaction.price)
        }

        // token transfers
        if (transaction.tokenTransfers) {
          for (const transfer of transaction.tokenTransfers) {
            const key = getTokenKey({ chain, address: transfer.tokenAddress })
            if (key) {
              const priceInfo = prices.coins[key]
              if (priceInfo && priceInfo.decimals) {
                transfer.price = priceInfo.price
                transfer.valueUSD = mulPrice(BigInt(transfer.value), priceInfo.decimals, priceInfo.price)
              }
            }
          }
        }
      }
    }

    const response: IHistory = {
      transactions: transactionsData,
      count,
      next: Math.min(offset + limit, count),
    }

    return success(response, { maxAge: 2 * 60 })
  } catch (e) {
    console.error('Failed to retrieve history', e)
    return serverError('Failed to retrieve history')
  }
}
