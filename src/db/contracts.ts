import { BaseContract, Contract, ContractStandard, ContractType } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface ContractStorage {
  type?: ContractType
  standard?: ContractStandard
  name?: string
  display_name?: string
  chain: string
  address: Buffer
  symbol?: string
  decimals?: number
  category?: string
  adapter_id: string
  stable?: boolean
  parent?: Buffer
  data?: any
}

export function fromStorage(contracts: ContractStorage[]) {
  const res: Contract[] = []
  const contractByKey: { [key: string]: Contract } = {}
  const underlyings: BaseContract[] = []
  const rewards: BaseContract[] = []

  for (const contract of contracts) {
    const c = {
      type: contract.type,
      standard: contract.standard,
      name: contract.name,
      displayName: contract.display_name,
      chain: contract.chain,
      address: bufToStr(contract.address),
      symbol: contract.symbol,
      decimals: contract.decimals,
      category: contract.category,
      adapterId: contract.adapter_id,
      stable: contract.stable,
      parent: contract.parent ? bufToStr(contract.parent) : undefined,
      ...contract.data,
    }

    const key = `${c.adapterId}#${c.chain}#${c.address}#${c.category}`

    if (contract.type === 'reward') {
      rewards.push(c)
    } else if (contract.type === 'underlying') {
      underlyings.push(c)
    } else {
      contractByKey[key] = c
      res.push(c)
    }
  }

  // link children to their parents
  for (const reward of rewards) {
    const key = `${reward.adapterId}#${reward.chain}#${reward.parent}#${reward.category}`
    const parent = contractByKey[key]
    if (!parent) {
      continue
    }

    if (!parent.rewards) {
      parent.rewards = []
    }
    const idx = reward.__idx
    if (idx != null) {
      parent.rewards[idx] = reward
    } else {
      parent.rewards.push(reward)
    }
  }

  for (const underlying of underlyings) {
    const key = `${underlying.adapterId}#${underlying.chain}#${underlying.parent}#${underlying.category}`
    const parent = contractByKey[key]
    if (!parent) {
      continue
    }

    if (!parent.underlyings) {
      parent.underlyings = []
    }
    const idx = underlying.__idx
    if (idx != null) {
      parent.underlyings[idx] = underlying
    } else {
      parent.underlyings.push(underlying)
    }
  }

  return res
}

export function toRow(contract: ContractStorage) {
  return [
    contract.type,
    contract.standard,
    contract.category,
    contract.name,
    contract.display_name,
    contract.chain,
    contract.address,
    contract.symbol,
    contract.decimals,
    contract.adapter_id,
    contract.stable,
    contract.parent,
    contract.data,
  ]
}

export function toStorage(contracts: Contract[], adapterId: string) {
  const res: ContractStorage[] = []

  for (const contract of contracts) {
    const {
      type,
      standard,
      name,
      displayName,
      chain,
      address,
      symbol,
      decimals,
      category,
      stable,
      rewards,
      underlyings,
      ...data
    } = contract

    const c = {
      type,
      standard,
      name,
      display_name: displayName,
      chain,
      address: strToBuf(address),
      symbol,
      decimals,
      category,
      adapter_id: adapterId,
      stable,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '')),
    }

    res.push(c)

    if (rewards && rewards.length > 0) {
      for (let idx = 0; idx < rewards.length; idx++) {
        const reward = rewards[idx]
        res.push({
          type: 'reward',
          standard: reward.standard,
          name: reward.name,
          display_name: reward.displayName,
          chain: reward.chain,
          address: strToBuf(reward.address),
          symbol: reward.symbol,
          decimals: reward.decimals,
          category,
          adapter_id: adapterId,
          stable: reward.stable,
          parent: c.address,
          data: { __idx: idx },
        })
      }
    }

    if (underlyings && underlyings.length > 0) {
      for (let idx = 0; idx < underlyings.length; idx++) {
        const underlying = underlyings[idx]
        res.push({
          type: 'underlying',
          standard: underlying.standard,
          name: underlying.name,
          display_name: underlying.displayName,
          chain: underlying.chain,
          address: strToBuf(underlying.address),
          symbol: underlying.symbol,
          decimals: underlying.decimals,
          category,
          adapter_id: adapterId,
          stable: underlying.stable,
          parent: c.address,
          data: { __idx: idx },
        })
      }
    }
  }

  return res
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
          'INSERT INTO contracts (type, standard, category, name, display_name, chain, address, symbol, decimals, adapter_id, stable, parent, data) VALUES %L ON CONFLICT DO NOTHING;',
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
 * Get a list of all unique protocols and contracts a given account interacted with
 * @param client
 * @param address
 */
export async function getAllContractsInteractionsTokenTransfers(client: PoolClient, address: string) {
  const res = await client.query("select * from all_contract_interactions_tt($1) where adapter_id <> 'wallet';", [
    strToBuf(address),
  ])

  return fromStorage(res.rows)
}

/**
 * Get a list of all unique protocols and contracts a given account interacted with
 * @param client
 * @param address
 */
export async function getContractsInteractionsTokenTransfers(client: PoolClient, address: string, adapterId: string) {
  const res = await client.query('select * from all_contract_interactions_tt($1) where adapter_id = $2;', [
    strToBuf(address),
    adapterId,
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
export async function getChainContractsInteractionsTokenTransfers(
  client: PoolClient,
  chain: Chain,
  address: string,
  adapterId: string,
) {
  const res = await client.query(
    'select * from all_contract_interactions_tt($1) where chain = $2 and adapter_id = $3;',
    [strToBuf(address), chain, adapterId],
  )

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

export function groupContracts(contracts: Contract[]) {
  const contractsMap: { [key: string]: Contract | Contract[] } = {}

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
