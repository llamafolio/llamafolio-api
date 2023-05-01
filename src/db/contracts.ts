import { Contract, ContractStandard } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface ContractStorage {
  standard?: ContractStandard
  name?: string
  chain: string
  address: string
  category?: string
  adapter_id: string
  data?: any
}

export function fromStorage(contractsStorage: ContractStorage[]) {
  const contracts: Contract[] = []

  for (const contractStorage of contractsStorage) {
    const contract = {
      ...contractStorage.data,
      standard: contractStorage.standard,
      name: contractStorage.name,
      chain: contractStorage.chain,
      address: contractStorage.address,
      category: contractStorage.category,
      adapterId: contractStorage.adapter_id,
    }

    contracts.push(contract)
  }

  return contracts
}

export function toRow(contract: ContractStorage) {
  return [
    contract.standard,
    contract.category,
    contract.name,
    contract.chain,
    contract.address,
    contract.adapter_id,
    contract.data,
  ]
}

export function toStorage(contracts: Contract[], adapterId: string) {
  const contractsStorage: ContractStorage[] = []

  for (const contract of contracts) {
    const { standard, name, chain, address, category, ...data } = contract

    const contractStorage = {
      standard,
      name,
      chain,
      address,
      category,
      adapter_id: adapterId,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '')),
    }

    contractsStorage.push(contractStorage)
  }

  return contractsStorage
}

export async function selectContractsByAdapterId(client: PoolClient, adapterId: string) {
  const adaptersContractsRes = await client.query('select * from adapters_contracts where adapter_id = $1;', [
    adapterId,
  ])

  return fromStorage(adaptersContractsRes.rows)
}

export function insertAdaptersContracts(
  client: PoolClient,
  contracts: { [key: string]: Contract | Contract[] | undefined },
  adapterId: string,
) {
  const values = toStorage(flattenContracts(contracts), adapterId).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          `
          INSERT INTO adapters_contracts (
            standard,
            category,
            name,
            chain,
            address,
            adapter_id,
            data
          ) VALUES %L ON CONFLICT DO NOTHING;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}

/**
 * Get a list of all contracts a given account interacted with for a given protocol
 * @param client
 * @param address
 * @param adapterId
 */
export async function getContractsInteractions(client: PoolClient, address: string, adapterId: string) {
  const walletQuery = `
    with interactions as (
      (
        select t.chain, t.token as address from erc20_transfers t
        where to_address = $1
      )
        union all
      (
        select t.chain, '0x0000000000000000000000000000000000000000' as address from transactions t
        where from_address = $1 limit 1
      )
    )
    select distinct on (c.chain, c.address) c.* from interactions i
    inner join adapters_contracts c on c.chain = i.chain and c.address = i.address
    where c.adapter_id = $2;
  `

  const protocolQuery = `
    with interactions as (
      select t.chain, t.to_address as address from transactions t
      where from_address = $1
    )
    select distinct on (c.chain, c.address) c.* from interactions i
    inner join adapters_contracts c on c.chain = i.chain and c.address = i.address
    where c.adapter_id = $2;
  `

  const res = await client.query(adapterId === 'wallet' ? walletQuery : protocolQuery, [address, adapterId])

  return fromStorage(res.rows)
}

/**
 * Get a list of all contracts a given account interacted with
 * @param client
 * @param address
 */
export async function getAllContractsInteractions(client: PoolClient, address: string) {
  const res = await client.query(
    `
  with interactions as (
    (
      select t.chain, t.to_address as address from transactions t
      where from_address = $1
    )
      union all
    (
      select t.chain, t.token as address from erc20_transfers t
      where to_address = $1
    )
      union all
    (
      select t.chain, '0x0000000000000000000000000000000000000000' as address from transactions t
      where from_address = $1 limit 1
    )
  )
  select distinct on (c.chain, c.address) c.* from interactions i
  inner join adapters_contracts c on c.chain = i.chain and c.address = i.address;
  `,
    [address],
  )

  return fromStorage(res.rows)
}

/**
 * Get a list of all unique protocols and contracts a given account interacted with, filtered by chain
 * @param client
 * @param chain
 * @param address
 * @param adapterId
 */
export async function getChainContractsInteractions(
  client: PoolClient,
  chain: Chain,
  address: string,
  adapterId: string,
) {
  const res = await client.query('select * from all_contract_interactions($1) where chain = $2 and adapter_id = $3;', [
    address,
    chain,
    adapterId,
  ])

  return fromStorage(res.rows)
}

/**
 * Get a list of all unique tokens received by a given account
 * @param client
 * @param address
 */
export async function getAllTokensInteractions(client: PoolClient, address: string) {
  const res = await client.query(
    `
    select distinct on (c.chain, c.address) c.* from erc20_transfers t
    inner join adapters_contracts c on t.chain = c.chain and t.token = c.address
    where to_address = $1;
    `,
    [address],
  )

  return fromStorage(res.rows)
}

/**
 *
 * @param client
 * @param adapterId
 */
export function deleteContractsByAdapterId(client: PoolClient, adapterId: string) {
  return client.query('DELETE FROM adapters_contracts WHERE adapter_id = $1;', [adapterId])
}

export function deleteContractsByAdapter(client: PoolClient, adapterId: string, chain: Chain) {
  return client.query('DELETE FROM adapters_contracts WHERE adapter_id = $1 AND chain = $2;', [adapterId, chain])
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
