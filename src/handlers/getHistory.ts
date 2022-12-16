import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { Chain } from '@lib/chains'
import { getTransactionHistory } from '@lib/indexer/fetchers'
import { INDEXER_HEADERS } from '@lib/indexer/utils'
import { APIGatewayProxyHandler } from 'aws-lambda'

interface TokenTransfer {
  symbol?: string
  decimals?: number
  token_address: string
  from_address: string
  to_address: string
  value: string
}

interface Transaction {
  chain: Chain
  block_number: string
  timestamp: string
  hash: string
  from_address: string
  to_address: string
  gas_used: string
  gas_price: string
  input_function_name?: string
  success: boolean
  adapter_id?: string
  token_transfers: TokenTransfer[]
}

/**
 * Get the history of a given address
 * Returns an array of transactions for all the chains including token transfers.
 */
export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const params = event.queryStringParameters

  let limit = parseInt(params?.limit ?? '100')

  if (limit > 100) {
    limit = 100
  }

  const page = params?.page === '0' ? '1' : params?.page ?? '1'

  const offset = ((parseInt(page) - 1) * limit).toFixed(0)

  const offsetNumber = parseInt(offset ?? '0')

  let chainsFilter = params?.chains

  if (chainsFilter) {
    chainsFilter = chainsFilter.replace(/"/g, '').replace(/'/g, '')
  }

  const chains = chainsFilter?.split(',') ?? []

  let protocolsFilter = params?.protocols

  if (protocolsFilter) {
    protocolsFilter = protocolsFilter.replace(/"/g, '').replace(/'/g, '')
  }

  const protocols = protocolsFilter?.split(',') ?? []

  const { txs, txs_aggregate } = await getTransactionHistory(
    address.toLowerCase(),
    limit,
    offsetNumber,
    chains,
    protocols,
    {},
    INDEXER_HEADERS,
  )

  const totalPages = (txs_aggregate.aggregate.count / limit).toFixed(0)

  const txParsed: Transaction[] = txs.map((tx) => {
    const chain = tx.chain === 'mainnet' ? 'ethereum' : tx.chain

    return {
      chain,
      block_number: tx.block_number,
      timestamp: tx.timestamp,
      hash: tx.hash,
      from_address: tx.from_address,
      to_address: tx.to_address,
      gas_used: tx.gas_used,
      gas_price: tx.gas_price,
      input_function_name: tx.method_name?.name,
      success: tx.receipt.success,
      adapter_id: tx.contract_interacted?.adapter_id?.adapter_id,
      token_transfers: tx.token_transfers_aggregate.nodes.map((token_transfer) => ({
        symbol: token_transfer.token_details.symbol,
        decimals: token_transfer.token_details.decimals,
        token_address: token_transfer.token,
        from_address: token_transfer.from_address,
        to_address: token_transfer.to_address,
        value: token_transfer.value,
      })),
    }
  })

  try {
    return success(
      {
        data: txParsed,
        totalPages,
        currentPage: page,
        nextPage: page >= totalPages ? undefined : (parseInt(page) + 1).toString(),
      },
      { maxAge: 2 * 60 },
    )
  } catch (e) {
    console.error('Failed to retrieve history', e)
    return serverError('Failed to retrieve history')
  }
}
