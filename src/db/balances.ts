import { ContractStorage } from '@db/contracts'
import { PricedBalance } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { PoolClient } from 'pg'
import format from 'pg-format'

// balances table is a duplicate of contracts (not normalized)
// because references might be stale as we don't update balances when revalidating contracts
export interface BalanceStorage extends ContractStorage {
  from_address: Buffer
  amount: string
  price?: string
  balance_usd?: string
  timestamp: string
}

export function fromStorage(balancesStorage: BalanceStorage[]) {
  const balances: (PricedBalance & { adapterId: string })[] = []

  for (const balanceStorage of balancesStorage) {
    const balance = {
      standard: balanceStorage.standard,
      name: balanceStorage.name,
      chain: balanceStorage.chain,
      address: bufToStr(balanceStorage.address),
      category: balanceStorage.category,
      adapterId: balanceStorage.adapter_id,
      price: balanceStorage.price ? parseFloat(balanceStorage.price) : undefined,
      amount: balanceStorage.amount,
      balanceUSD: balanceStorage.balance_usd ? parseFloat(balanceStorage.balance_usd) : undefined,
      timestamp: balanceStorage.timestamp,
      ...balanceStorage.data,
    }

    balances.push(balance)
  }

  return balances
}

export function toRow(balance: BalanceStorage) {
  return [
    balance.from_address,
    balance.standard,
    balance.category,
    balance.name,
    balance.chain,
    balance.address,
    balance.adapter_id,
    balance.price,
    balance.amount,
    balance.balance_usd,
    balance.timestamp,
    balance.data,
  ]
}

export function toStorage(balances: PricedBalance[], adapterId: string, fromAddress: string, timestamp: Date) {
  const balancesStorage: BalanceStorage[] = []

  for (const balance of balances) {
    const { standard, name, chain, address, category, price, amount, balanceUSD, ...data } = balance

    const balanceStorage = {
      from_address: strToBuf(fromAddress),
      standard,
      name,
      chain,
      address: strToBuf(address),
      category,
      adapter_id: adapterId,
      price,
      amount: amount.toString(),
      balance_usd: balanceUSD,
      timestamp,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '')),
    }

    balancesStorage.push(balanceStorage)
  }

  return balancesStorage
}

export async function selectBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(`select * from balances where from_address = $1::bytea;`, [
    strToBuf(fromAddress),
  ])

  return fromStorage(balancesRes.rows)
}

export function insertBalances(
  client: PoolClient,
  balances: PricedBalance[],
  adapterId: string,
  fromAddress: string,
  timestamp: Date,
) {
  const values = toStorage(balances, adapterId, fromAddress, timestamp).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          'INSERT INTO balances (from_address, standard, category, name, chain, address, adapter_id, price, amount, balance_usd, timestamp, data) VALUES %L ON CONFLICT DO NOTHING;',
          chunk,
        ),
        [],
      ),
    ),
  )
}
