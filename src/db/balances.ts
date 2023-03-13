import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
import { Category } from '@lib/category'
import { PoolClient } from 'pg'
import format from 'pg-format'

export interface Balance {
  groupId: string
  amount: string
  price?: string
  balanceUSD: string
  address: string
  category: Category
  data?: any
}

export interface BalanceStorage {
  group_id: string
  amount: string
  price?: string
  balance_usd: string
  address: Buffer
  category: string
  data?: any
}

export interface BalanceStorable {
  group_id: string
  amount: string
  price?: string
  balance_usd: string
  address: Buffer
  category: Category
  data?: any
}

export function fromRowStorage(balanceStorage: BalanceStorage) {
  const balance: Balance = {
    ...balanceStorage.data,
    address: bufToStr(balanceStorage.address),
    price: balanceStorage.price ? parseFloat(balanceStorage.price) : undefined,
    amount: balanceStorage.amount,
    balanceUSD: balanceStorage.balance_usd ? parseFloat(balanceStorage.balance_usd) : undefined,
    category: balanceStorage.category,
  }

  return balance
}

export function fromStorage(balancesStorage: BalanceStorage[]) {
  return balancesStorage.map(fromRowStorage)
}

export function toRow(balance: BalanceStorable) {
  return [
    balance.group_id,
    balance.amount,
    balance.price,
    balance.balance_usd,
    balance.address,
    balance.category,
    balance.data,
  ]
}

export function toStorage(balances: Balance[]) {
  const balancesStorable: BalanceStorable[] = []

  for (const balance of balances) {
    const { groupId, address, price, amount, balanceUSD, category, ...data } = balance

    const balanceStorable: BalanceStorable = {
      group_id: groupId,
      amount: amount.toString(),
      price,
      balance_usd: balanceUSD,
      address: strToBuf(address),
      category,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '')),
    }

    balancesStorable.push(balanceStorable)
  }

  return balancesStorable
}

export async function selectBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(`select * from balances where from_address = $1::bytea;`, [
    strToBuf(fromAddress),
  ])

  return fromStorage(balancesRes.rows)
}

export function deleteBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  return client.query(format('delete from balances where from_address = %L::bytea', [strToBuf(fromAddress)]), [])
}

export function insertBalances(client: PoolClient, balances: Balance[]) {
  const values = toStorage(balances).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          `INSERT INTO balances (
            group_id,
            amount,
            price,
            balance_usd,
            address,
            category,
            data
          ) VALUES %L ON CONFLICT DO NOTHING;
          `,
          chunk,
        ),
        [],
      ),
    ),
  )
}
