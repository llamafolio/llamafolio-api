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
  receipts: {
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

export interface IIndexerInteractions {
  contract_interacted: {
    contract: string
    adapter?: { adapter_id?: string }
    chain: string
  }
}

export interface IIndexerERC20TokenInteractions {
  token_details: {
    address: string
    chain: string
    decimals: number
    name: string
    symbol: string
  }
}

export interface IIndexerERC20TokenBalance {
  balance: string
  chain: string
  token: string
  token_details?: {
    name: string
    symbol: string
    decimals: string
  }
}

export interface IIndexerBlock {
  base_fee_per_gas: string
  block_hash: string
  chain: string
  difficulty: string
  extra_data: string
  gas_limit: string
  gas_used: string
  logs_bloom: string
  miner: string
  mix_hash: string
  nonce: string
  number: number
  parent_hash: string
  receipts_root: string
  sha3_uncles: string
  size: number
  state_root: string
  timestamp: string
  total_difficulty: string
  transactions: number
  transactions_data_aggregate: {
    nodes: {
      hash: string
    }[]
  }
  uncles: string[]
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
