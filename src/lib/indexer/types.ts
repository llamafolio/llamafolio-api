export interface IndexerTransaction {
  block_number: string
  chain:
    | 'ethereum'
    | 'bsc'
    | 'polygon'
    | 'fantom'
    | 'xdai'
    | 'optimism'
    | 'avax'
    | 'arbitrum'
    | 'celo'
    | 'harmony'
    | 'mainnet'
  from_address: string
  gas_price: string
  gas_used: string
  hash: string
  timestamp: string
  input: string
  max_fee_per_gas: string
  max_priority_fee_per_gas: string
  to_address: string
  transaction_index: number
  transaction_type: number
  value: string
  token_transfers_aggregate: {
    nodes: {
      from_address: string
      to_address: string
      log_index: number
      token: string
      value: string
      token_details: {
        decimals: number
        name: string
        symbol: string
      }
    }[]
  }
  receipt: {
    success: boolean
  }
  logs_aggregate: {
    nodes: {
      address: string
      data: string
      log_index: number
      log_type: string
      topics: string[]
      transaction_log_index: number
    }[]
  }
  contract_interacted:
    | {
        contract: string
        adapter_id: string | undefined
      }
    | undefined
  contract_created:
    | {
        contract: string
      }
    | undefined
  method_name:
    | {
        name: string
      }
    | undefined
}
