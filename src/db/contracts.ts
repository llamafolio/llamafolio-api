import type { ClickHouseClient } from '@clickhouse/client'
import type { Contract, ContractStandard } from '@lib/adapter'
import { chainByChainId, chainById } from '@lib/chains'
import { toDateTime } from '@lib/fmt'

export interface ContractStorage {
  standard?: ContractStandard
  name?: string
  chain: string
  address: string
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

export function toStorage(contracts: Contract[], adapterId: string, timestamp: Date) {
  const contractsStorage: ContractStorage[] = []

  for (const contract of contracts) {
    const { standard, name, chain, address, category, ...data } = contract

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

export async function selectAdaptersContractsByAddress(client: ClickHouseClient, address: string, chainId: number) {
  const queryRes = await client.query({
    query:
      'SELECT * FROM lf.adapters_contracts FINAL WHERE "chain" = {chainId: UInt8} AND "address" = {address: String};',
    query_params: {
      address: address.toLowerCase(),
      chainId,
    },
  })

  const res = (await queryRes.json()) as {
    data: ContractStorage[]
  }

  return fromStorage(res.data)
}

export async function insertAdaptersContracts(
  client: ClickHouseClient,
  contracts: Contract[],
  adapterId: string,
  timestamp: Date,
) {
  const values = toStorage(contracts, adapterId, timestamp)

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: 'lf.adapters_contracts',
    values: values,
    format: 'JSONEachRow',
  })
}

/**
 * Get a list of all contracts a given account interacted with for a given protocol
 * @param client
 * @param address
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
      SELECT *
      FROM lf.adapters_contracts FINAL
      WHERE
        ${condition}
        ("chain", "address") IN (
          SELECT "chain", "address" FROM (
            (
              SELECT "chain", "to" AS "address"
              FROM evm_indexer.transactions_to_mv
              WHERE "from" = {address: String}
            )
              UNION ALL
            (
              SELECT "chain", "address"
              FROM evm_indexer.token_transfers_received_mv
              WHERE "to" = {address: String}
            )
          )
          GROUP BY "chain", "address"
        );
    `,
    query_params: {
      address: address.toLowerCase(),
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
      SELECT *
      FROM lf.adapters_contracts FINAL
      WHERE
        adapter_id = 'wallet' AND
        ("chain", "address") IN (
          SELECT "chain", "address"
          FROM evm_indexer.token_transfers_received_mv
          WHERE "to" = {address: String}
          GROUP BY "chain", "address"
        );
    `,
    query_params: {
      address: address.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: ContractStorage[]
  }

  return fromStorage(res.data)
}

export async function getContract(client: ClickHouseClient, chainId: number, address: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "hash",
        "timestamp",
        "from",
        "block_number",
        "contract_created"
      FROM evm_indexer.transactions
      WHERE
        "chain" = {chainId: UInt64} AND
        "contract_created" = {address: String};
    `,
    query_params: {
      address: address.toLowerCase(),
      chainId,
    },
  })

  const res = (await queryRes.json()) as {
    data: { chain: string; hash: string; timestamp: string; from: string; block_number: string }[]
  }

  if (res.data.length === 0) {
    return null
  }

  return {
    block: parseInt(res.data[0].block_number),
    chain: chainByChainId[parseInt(res.data[0].chain)]?.id,
    contract: address,
    creator: res.data[0].from,
    hash: res.data[0].hash,
  }
}

export function deleteContractsByAdapterId(client: ClickHouseClient, adapterId: string) {
  return client.command({
    query: 'DELETE FROM lf.adapters_contracts WHERE adapter_id = {adapterId: String};',
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
