import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { Contract, ContractStandard } from '@lib/adapter'
import { groupBy, keyBy, sliceIntoChunks } from '@lib/array'
import { chainByChainId, chainById, chainIds } from '@lib/chains'
import { shortAddress, toDateTime } from '@lib/fmt'

export interface ContractStorage {
  standard?: ContractStandard
  name?: string
  chain: string
  address: string
  token: string
  category?: string
  adapter_id: string
  data?: string
  created_at?: string
}

export function fromStorage(contractsStorage: ContractStorage[]) {
  const contracts: Contract[] = []

  for (const contractStorage of contractsStorage) {
    const data = JSON.parse(contractStorage.data || '{}')

    const contract = {
      ...data,
      decimals: data?.decimals ? parseInt(data.decimals) : undefined,
      standard: contractStorage.standard,
      name: contractStorage.name,
      chain: chainByChainId[parseInt(contractStorage.chain)]?.id,
      address: contractStorage.address,
      token: contractStorage.token,
      category: contractStorage.category,
      adapterId: contractStorage.adapter_id,
      underlyings: data?.underlyings?.map((underlying: any) => ({
        ...underlying,
        decimals: parseInt(underlying.decimals),
      })),
    }

    contracts.push(contract)
  }

  return contracts
}

export function toStorage(contracts: Contract[]) {
  const contractsStorage: ContractStorage[] = []

  for (const contract of contracts) {
    const { standard, name, chain, address, token, category, adapterId, timestamp, ...data } = contract

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    const contractStorage = {
      standard,
      name,
      chain: chainId,
      address: address.toLowerCase(),
      token: (token || '').toLowerCase(),
      category,
      adapter_id: adapterId,
      data: JSON.stringify(data),
      rewards: (data?.rewards || []).map((reward) => (reward as Contract).address.toLowerCase()).sort(),
      underlyings: (data?.underlyings || []).map((underlying) => (underlying as Contract).address.toLowerCase()).sort(),
      created_at: toDateTime(timestamp),
    }

    contractsStorage.push(contractStorage)
  }

  return contractsStorage
}

export async function selectContracts(client: ClickHouseClient, chainId: number, addresses: string[]) {
  // NOTE: prevent "Field value too long" errors
  const slices = sliceIntoChunks(addresses, 1000)

  const slicesContracts = await Promise.all(
    slices.map(async (addresses) => {
      const queryRes = await client.query({
        query: `
          SELECT
            "chain",
            "address",
            "adapter_id",
            "data"
          FROM ${environment.NS_LF}.adapters_contracts
          WHERE "chain" = {chainId: UInt8} AND "address" IN {addresses: Array(String)};
        `,
        query_params: {
          chainId,
          addresses,
        },
      })

      const res = (await queryRes.json()) as {
        data: { chain: string; address: string; adapter_id: string; data: string }[]
      }

      return fromStorage(res.data)
    }),
  )

  return slicesContracts.flat()
}

/**
 * Return token info from adapters_contracts
 * @param client
 * @param address
 * @param chainId
 */
export async function selectAdaptersContractsToken(client: ClickHouseClient, address: string, chainId: number) {
  const queryRes = await client.query({
    query: `
      SELECT
        "adapter_id",
        "category",
        JSONExtractString("data", 'symbol') AS "symbol",
        JSONExtractUInt("data", 'decimals') AS "decimals",
        JSONExtractString("data", 'token') AS "token",
        JSONExtractArrayRaw(data, 'underlyings') AS underlyings
      FROM ${environment.NS_LF}.adapters_contracts
      WHERE "chain" = {chainId: UInt8} AND "address" = {address: String};
    `,
    query_params: {
      address: address.toLowerCase(),
      chainId,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      adapter_id: string
      category: string | null
      underlyings: string[]
      symbol: string
      decimals: number
      token: string
    }[]
  }

  return res.data.map((row) => {
    row.underlyings = row.underlyings.map((underlying) => JSON.parse(underlying))
    return row
  })
}

export async function insertAdaptersContracts(client: ClickHouseClient, contracts: Contract[]) {
  const values = toStorage(contracts)

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: `${environment.NS_LF}.adapters_contracts`,
    values: values,
    format: 'JSONEachRow',
  })
}

/**
 * Get a list of all contracts a given account interacted with for a given protocol
 * @param client
 * @param address wallet
 * @param adapterId
 * @param chainId
 */
export async function getContractsInteractions(
  client: ClickHouseClient,
  address: string,
  adapterId?: string,
  chainId?: number,
) {
  let condition = ' '
  if (adapterId != null) {
    condition += 'adapter_id = {adapterId: String} AND '
  }
  if (chainId != null) {
    condition += 'chain = {chainId: UInt64} AND '
  }

  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "address",
        "token",
        "category",
        "adapter_id",
        "data"
      FROM ${environment.NS_LF}.adapters_contracts
      WHERE
        ${condition}
        ("chain", "address") IN (
          SELECT "chain", "address" FROM (
            (
              SELECT "chain", "to_address" AS "address"
              FROM evm_indexer2.transactions_from_to_agg
              WHERE
                "from_short" = {addressShort: String} AND
                "from_address" = {address: String}
            )
              UNION DISTINCT
            (
              SELECT "chain", "address"
              FROM evm_indexer2.tokens_balances_mv
              WHERE
                "holder_short" = {addressShort: String} AND
                "holder" = {address: String} AND
                "type" = 'erc20'
              GROUP BY "chain", "holder_short", "holder", "address_short", "address", "id", "type"
              LIMIT 1 BY "chain", "address"
            )
          )
        )
      LIMIT 1 BY "chain", "address", "adapter_id";
    `,
    query_params: {
      addressShort: shortAddress(address),
      address,
      adapterId,
      chainId,
    },
  })

  const res = (await queryRes.json()) as {
    data: ContractStorage[]
  }

  return fromStorage(res.data)
}

export async function getWalletInteractions(client: ClickHouseClient, address: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "address",
        JSONExtractString("data", 'symbol') AS "symbol",
        JSONExtractUInt("data", 'decimals') AS "decimals"
      FROM ${environment.NS_LF}.adapters_contracts
      WHERE
        adapter_id = 'wallet' AND
        ("chain", "address") IN (
          SELECT "chain", "address"
          FROM evm_indexer2.tokens_balances_mv
          WHERE
            "holder_short" = {addressShort: String} AND
            "holder" = {address: String} AND
            "type" = 'erc20'
          GROUP BY "chain", "holder_short", "holder", "address_short", "address", "id", "type"
          LIMIT 1 BY "chain", "address"
        );
    `,
    query_params: {
      address,
      addressShort: shortAddress(address),
    },
  })

  const res = (await queryRes.json()) as {
    data: { chain: number; address: string; decimals: number; symbol: string }[]
  }

  const rowsByChain = groupBy(res.data, 'chain')

  const tokensByChain: { [chain: string]: Contract[] } = {}

  for (const chainId in rowsByChain) {
    const chain = chainByChainId[parseInt(chainId)]?.id
    if (!chain) {
      console.error(`Could not find chain ${chainId}`)
      continue
    }

    tokensByChain[chain] = []

    const rowByAddress = keyBy(rowsByChain[chainId], 'address')

    for (const address in rowByAddress) {
      const row = rowByAddress[address]
      if (!row.decimals || !row.symbol) {
        continue
      }

      tokensByChain[chain].push({
        chain,
        address: address as `0x${string}`,
        decimals: row.decimals,
        symbol: row.symbol,
      })
    }
  }

  return tokensByChain
}

export async function getContract(client: ClickHouseClient, chainId: number, address: string) {
  // TODO: use explorers API to lookup missing contracts (might have been created in Traces)
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "creator",
        "transaction_hash",
        "name",
        "abi",
        "verified",
        "block_number",
        "timestamp"
      FROM ${environment.NS_LF}.contracts
      WHERE
        "chain" = {chainId: UInt64} AND
        "address" = {address: String};
    `,
    query_params: {
      address: address.toLowerCase(),
      chainId,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      creator: string
      transaction_hash: string
      name: string
      abi: string | null
      verified: boolean | null
      block_number: string
      timestamp: string
    }[]
  }

  if (res.data.length === 0) {
    return null
  }

  const row = res.data[0]

  return {
    block: parseInt(row.block_number),
    chain: chainByChainId[parseInt(row.chain)]?.id,
    contract: address,
    creator: row.creator,
    hash: row.transaction_hash,
    verified: row.verified,
    abi: row.abi ? JSON.parse(row.abi) : null,
    name: row.name,
  }
}

export async function selectTrendingContracts(client: ClickHouseClient, window: string, chainId?: number) {
  const contracts: { chain: string; chainId: number; address: string; count: number }[] = []
  const hours: { [key: string]: number } = {
    D: 24,
    W: 24 * 7,
    M: 24 * 30,
  }

  const interval = hours[window] || 24

  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "to_address" AS "address",
        count() as "count"
      FROM evm_indexer2.transactions_to_mv
      WHERE
        "chain" IN {chainIds: Array(UInt64)} AND
        toStartOfHour("timestamp") >= toStartOfHour(now()) - interval {interval: UInt16} hour
      GROUP BY "chain", "to_address"
      ORDER BY "count" DESC
      LIMIT 100
    `,
    query_params: {
      chainIds: chainId != null ? [chainId] : chainIds,
      interval,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      address: string
      count: string
    }[]
  }

  for (const row of res.data) {
    const chainId = parseInt(row.chain)
    const chain = chainByChainId[chainId]
    if (chain == null) {
      continue
    }

    contracts.push({
      chain: chain.id,
      chainId,
      address: row.address,
      count: parseInt(row.count),
    })
  }

  return contracts
}

export function deleteContractsByAdapterId(client: ClickHouseClient, adapterId: string) {
  return client.command({
    query: `DELETE FROM ${environment.NS_LF}.adapters_contracts WHERE adapter_id = {adapterId: String};`,
    query_params: { adapterId },
    clickhouse_settings: {
      enable_lightweight_delete: 1,
      mutations_sync: '2',
    },
  })
}

export function flattenContracts(contracts: { [key: string]: Contract | Contract[] | undefined }) {
  const contractsList: Contract[] = []

  for (const key in contracts) {
    if (Array.isArray(contracts[key])) {
      const keyContracts = contracts[key] as Contract[]
      for (const contract of keyContracts) {
        contractsList.push({ ...contract, __key: key, __key_is_array: true })
      }
    } else if (contracts[key]) {
      const contract = contracts[key] as Contract
      contractsList.push({ ...contract, __key: key, __key_is_array: false })
    }
  }

  return contractsList
}

export function groupContracts<T extends Contract>(contracts: T[]) {
  const contractsMap: { [key: string]: T | T[] } = {}

  for (const contract of contracts) {
    if (contract.__key != null) {
      if (contract.__key_is_array) {
        if (!contractsMap[contract.__key]) {
          contractsMap[contract.__key] = []
        }
        contractsMap[contract.__key].push(contract)
      } else {
        contractsMap[contract.__key] = contract
      }
    }
  }

  return contractsMap
}

export interface ContractInfo {
  chain: number
  address: string
  creator: string
  transaction_hash: string
  name: string
  abi: string
  verified: boolean
  adapter_id: string
  timestamp: string
  updated_at: string
  data: string
}

export async function insertContracts(client: ClickHouseClient, values: ContractInfo[]) {
  if (values.length === 0) {
    return
  }

  await client.insert({
    table: `${environment.NS_LF}.contracts`,
    values: values,
    format: 'JSONEachRow',
  })
}
