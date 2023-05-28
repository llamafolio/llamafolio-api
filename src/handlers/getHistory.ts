import { selectHistory, selectHistoryAggregate } from '@db/history'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { ADDRESS_ZERO } from '@lib/contract'
import { mulPrice } from '@lib/math'
import { getTokenKey, getTokenPrices } from '@lib/price'
import type { Token } from '@lib/token'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface ITransaction {
  chain: string
  block_number: string
  timestamp: number
  hash: string
  from_address: string
  to_address: string
  gas_used: string
  gas_price: string
  input_function_name: string | undefined
  success: boolean
  adapter_id?: string | null
  token_transfers: {
    symbol?: string
    decimals?: number
    token_address: string
    from_address: string
    to_address: string
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

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address

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
  const limit = parseInt(queries?.limit || '') || 50

  const client = await pool.connect()

  try {
    const [transactions, transactionsAggregate] = await Promise.all([
      selectHistory(client, address.toLowerCase(), limit, offset, chains, protocols),
      selectHistoryAggregate(client, address.toLowerCase(), chains, protocols),
    ])

    const count = parseInt(transactionsAggregate.aggregate.count)

    const transactionsData: ITransaction[] = transactions.map((tx: any) => ({
      chain: tx.chain,
      block_number: tx.block_number,
      timestamp: parseInt(tx.timestamp),
      hash: tx.hash,
      from_address: tx.from_address,
      to_address: tx.to_address,
      gas_used: tx.gas,
      gas_price: tx.gas_price,
      input_function_name: tx.method_name?.name,
      success: tx.receipt?.status === '1',
      adapter_id: tx.adapters_contracts?.[0]?.adapter_id,
      value: tx.value,
      token_transfers: tx.erc20_transfers_aggregate?.nodes.map((token_transfer: any) => ({
        name: token_transfer?.token_details?.name,
        symbol: token_transfer?.token_details?.symbol,
        decimals: token_transfer?.token_details?.decimals,
        token_address: token_transfer?.token,
        from_address: token_transfer?.from_address,
        to_address: token_transfer?.to_address,
        value: token_transfer?.value,
      })),
    }))

    // 1. collect tokens / coins
    // 2. fetch their prices
    // 3. attach prices to tokens / coins
    const tokensByChain: { [chain: string]: string[] } = {}

    for (const transaction of transactionsData) {
      // gas transfer
      if (transaction.value !== '0') {
        if (!tokensByChain[transaction.chain]) {
          tokensByChain[transaction.chain] = []
        }
        tokensByChain[transaction.chain].push(ADDRESS_ZERO)
      }

      // token transfers
      if (transaction.token_transfers) {
        for (const transfer of transaction.token_transfers) {
          if (!tokensByChain[transaction.chain]) {
            tokensByChain[transaction.chain] = []
          }
          tokensByChain[transaction.chain].push(transfer.token_address)
        }
      }
    }

    const tokens = Object.keys(tokensByChain).flatMap((chain) =>
      tokensByChain[chain].map((address) => ({ chain, address } as Token)),
    )

    const prices = await getTokenPrices(tokens)

    for (const transaction of transactionsData) {
      // gas transfer
      if (transaction.value !== '0') {
        const key = getTokenKey({ chain: transaction.chain, address: ADDRESS_ZERO } as Token)
        if (key) {
          const priceInfo = prices.coins[key]
          if (priceInfo && priceInfo.decimals) {
            transaction.price = priceInfo.price
            transaction.valueUSD = mulPrice(transaction.value, priceInfo.decimals, priceInfo.price)
          }
        }
      }

      // token transfers
      if (transaction.token_transfers) {
        for (const transfer of transaction.token_transfers) {
          const key = getTokenKey({ chain: transaction.chain, address: transfer.token_address } as Token)
          if (key) {
            const priceInfo = prices.coins[key]
            if (priceInfo && priceInfo.decimals) {
              transfer.price = priceInfo.price
              transfer.valueUSD = mulPrice(transfer.value, priceInfo.decimals, priceInfo.price)
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
  } finally {
    client.release(true)
  }
}
