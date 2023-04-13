import { sliceIntoChunks } from '@lib/array'
import { strToBuf } from '@lib/buf'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'
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
  address: string
  category: string
  data?: any
}

export interface BalanceStorable {
  group_id: string
  amount: string
  price?: string
  balance_usd: string
  address: string
  category: Category
  data?: any
}

Object.defineProperties(BigNumber.prototype, {
  toJSON: {
    value: function (this: BigNumber) {
      return this.toString()
    },
  },
})

export function fromRowStorage(balanceStorage: BalanceStorage) {
  const balance: Balance = {
    ...balanceStorage.data,
    address: balanceStorage.address,
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
      address,
      category,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, '')),
    }

    balancesStorable.push(balanceStorable)
  }

  return balancesStorable
}

export async function selectBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesRes = await client.query(`select * from balances where from_address = $1;`, [fromAddress])

  return fromStorage(balancesRes.rows)
}

export async function selectBalancesHolders(client: PoolClient, contractAddress: string, chain: Chain, limit: number) {
  const res = await client.query(
    format(
      `
      select bg.from_address as address, b.amount from balances b
      inner join balances_groups bg on b.group_id = bg.id
      where (
        b.address = %L and
        bg.chain = %L and
        bg.adapter_id = 'wallet'
      )
      order by b.amount desc limit %L;
      `,
      contractAddress,
      chain,
      limit,
    ),
  )

  return res.rows
}

export function deleteBalancesByFromAddress(client: PoolClient, fromAddress: string) {
  return client.query(format('delete from balances where from_address = %L', [strToBuf(fromAddress)]), [])
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
