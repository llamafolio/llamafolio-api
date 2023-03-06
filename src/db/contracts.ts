import { Contract, ContractStandard } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface ContractStorage {
  standard?: ContractStandard
  name?: string
  chain: string
  address: Buffer
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
      address: bufToStr(contractStorage.address),
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
      address: strToBuf(address),
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
  const adaptersContractsRes = await client.query('select * from contracts where adapter_id = $1;', [adapterId])

  return fromStorage(adaptersContractsRes.rows)
}

export function insertContracts(
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
          'INSERT INTO contracts (standard, category, name, chain, address, adapter_id, data) VALUES %L ON CONFLICT DO NOTHING;',
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
  const res = await client.query('select * from all_contract_interactions($1) where adapter_id = $2;', [
    strToBuf(address),
    adapterId,
  ])

  return fromStorage(res.rows)
}

/**
 * Get a list of all unique protocols and contracts a given account interacted with
 * @param client
 * @param address
 */
export async function getAllContractsInteractions(client: PoolClient, address: string) {
  const res = await client.query("select * from all_contract_interactions($1) where adapter_id <> 'wallet';", [
    strToBuf(address),
  ])

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
    strToBuf(address),
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
  const res = await client.query('select * from all_token_received($1);', [strToBuf(address)])

  return fromStorage(res.rows)
}

/**
 * Get a list of all unique tokens received by a given account, filtered by chain
 * @param client
 * @param chain
 * @param address
 */
export async function getAllChainTokensInteractions(client: PoolClient, chain: Chain, address: string) {
  const res = await client.query('select * from all_token_received($1) where chain = $2;', [strToBuf(address), chain])

  return fromStorage(res.rows)
}

/**
 *
 * @param client
 * @param adapterId
 */
export function deleteContractsByAdapterId(client: PoolClient, adapterId: string) {
  return client.query('DELETE FROM contracts WHERE adapter_id = $1;', [adapterId])
}

export function deleteContractsByAdapter(client: PoolClient, adapterId: string, chain: Chain) {
  return client.query('DELETE FROM contracts WHERE adapter_id = $1 AND chain = $2;', [adapterId, chain])
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
