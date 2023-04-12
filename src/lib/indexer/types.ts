export interface IIndexerTransaction {
  contract_interacted?: {
    contract: string
    adapter?: { adapter_id?: string }
  }
  block_number: string
  chain: string
  from_address: string
  gas_price: string
  gas: string
  hash: string
  method_name?: {
    name: string
  }
  receipt: {
    status: string
  }
  timestamp: string
  to_address: string
  token_transfers_aggregate: {
    nodes: {
      from_address: string
      to_address: string
      log_index: number
      token: string
      value: string
      token_details?: {
        decimals: number
        name: string
        symbol: string
      }
    }[]
  }
  value: string
}

export interface IIndexerContract {
  contract_information?: { abi?: string; name?: string }
  adapter?: { adapter_id: string }
  block: number
  chain: string
  contract: string
  creator: string
  hash: string
  parsed: boolean
}
