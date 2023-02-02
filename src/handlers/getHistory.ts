import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { getTransactionHistory } from '@lib/indexer/fetchers'
import { HASURA_HEADERS } from '@lib/indexer/utils'
import { APIGatewayProxyHandler } from 'aws-lambda'

export interface ITransaction {
  chain: string
  block_number: string
  timestamp: string
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
  }[]
  value: string
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

  const limit = 50

  const pageQuery = queries?.page === '0' ? 1 : queries?.page ? parseInt(queries?.page) : 1

  const offset = ((pageQuery - 1) * limit).toFixed(0)

  const offsetNumber = parseInt(offset)

  const { transactions, transactions_aggregate } = await getTransactionHistory(
    address.toLowerCase(),
    limit,
    offsetNumber,
    chains,
    protocols,
    HASURA_HEADERS,
  )

  const pages = parseInt((transactions_aggregate.aggregate.count / limit).toFixed(0))

  const transactionsData: ITransaction[] = transactions.map((tx) => {
    let chain = tx.chain

    // Special cases to match the indexer chain name

    if (chain === 'mainnet') {
      chain = 'ethereum'
    }

    if (chain === 'avalanche') {
      chain = 'avax'
    }

    return {
      chain,
      block_number: tx.block_number,
      timestamp: tx.timestamp,
      hash: tx.hash,
      from_address: tx.from_address,
      to_address: tx.to_address,
      gas_used: tx.gas,
      gas_price: tx.gas_price,
      input_function_name: tx.method_name?.name,
      success: tx.receipts?.status === '1',
      adapter_id: tx.contract_interacted?.adapter?.adapter_id,
      value: tx.value,
      token_transfers: tx.token_transfers_aggregate.nodes.map((token_transfer) => ({
        name: token_transfer?.token_details?.name,
        symbol: token_transfer?.token_details?.symbol,
        decimals: token_transfer?.token_details?.decimals,
        token_address: token_transfer?.token,
        from_address: token_transfer?.from_address,
        to_address: token_transfer?.to_address,
        value: token_transfer?.value,
      })),
    }
  })

  try {
    return success(
      {
        transactions: transactionsData,
        total_pages: pages,
        current_page: pageQuery >= pages ? pages : pageQuery,
        next_page: pageQuery >= pages ? pages : pageQuery + 1,
      },
      { maxAge: 2 * 60 },
    )
  } catch (e) {
    console.error('Failed to retrieve history', e)
    return serverError('Failed to retrieve history')
  }
}
