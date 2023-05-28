import type { BalancesGroup } from '@db/balances-groups'
import { deleteBalancesGroupsCascadeByFromAddress, insertBalancesGroups } from '@db/balances-groups'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { strToBuf } from '@lib/buf'
import type { Category } from '@lib/category'
import type { Chain } from '@lib/chains'
import { sleep } from '@lib/promise'
import type { PoolClient } from 'pg'
import format from 'pg-format'

export interface Balance {
  groupId: string
  amount: bigint
  price?: string
  balanceUSD?: number
  rewardUSD?: number
  debtUSD?: number
  address: string
  category: Category
  data?: any
}

export interface BalanceStorage {
  group_id: string
  amount: string
  price?: string
  balance_usd?: string
  reward_usd?: string
  debt_usd?: string
  address: string
  category: string
  data?: any
}

export interface BalanceStorable {
  group_id: string
  amount: string
  price?: string
  balance_usd?: number
  reward_usd?: number
  debt_usd?: number
  address: string
  category: Category
  data?: any
}

Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
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
    rewardUSD: balanceStorage.reward_usd ? parseFloat(balanceStorage.reward_usd) : undefined,
    debtUSD: balanceStorage.debt_usd ? parseFloat(balanceStorage.debt_usd) : undefined,
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
    balance.reward_usd,
    balance.debt_usd,
    balance.address.toLowerCase(),
    balance.category,
    balance.data,
  ]
}

export function toStorage(balances: Balance[]) {
  const balancesStorable: BalanceStorable[] = []

  for (const balance of balances) {
    const { groupId, address, price, amount, balanceUSD, rewardUSD, debtUSD, category, ...data } = balance

    const balanceStorable: BalanceStorable = {
      group_id: groupId,
      amount: amount.toString(),
      price,
      balance_usd: balanceUSD,
      reward_usd: rewardUSD,
      debt_usd: debtUSD,
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

export async function selectBalancesWithGroupsAndYieldsByFromAddress(client: PoolClient, fromAddress: string) {
  const balancesGroups: any[] = []

  const queryRes = await client.query(
    `
    select
      bg.id as group_id,
      bg.adapter_id,
      bg.chain,
      bg.balance_usd as g_balance_usd,
      bg.debt_usd as g_debt_usd,
      bg.reward_usd as g_reward_usd,
      bg.health_factor,
      bg.timestamp,
      bg.from_address,
      b.amount,
      b.price,
      b.balance_usd,
      b.reward_usd,
      b.debt_usd,
      b.address,
      b.category,
      b.data,
      y.apy,
      y.apy_base,
      y.apy_reward,
      y.apy_mean_30d,
      y.il_risk
    from balances_groups bg
    inner join balances b on b.group_id = bg.id
    left join yields y on y.chain = bg.chain and y.address = b.address and y.adapter_id = bg.adapter_id
    where bg.from_address = $1;
  `,
    [fromAddress.toLowerCase()],
  )

  const balancesByGroupId = groupBy(queryRes.rows, 'group_id')

  for (const groupId in balancesByGroupId) {
    const balances = balancesByGroupId[groupId]

    balancesGroups.push({
      adapterId: balances[0].adapter_id,
      chain: balances[0].chain,
      balanceUSD: balances[0].g_balance_usd != null ? parseFloat(balances[0].g_balance_usd) : undefined,
      debtUSD: balances[0].g_debt_usd != null ? parseFloat(balances[0].g_debt_usd) : undefined,
      rewardUSD: balances[0].g_reward_usd != null ? parseFloat(balances[0].g_reward_usd) : undefined,
      healthFactor: balances[0].health_factor != null ? parseFloat(balances[0].health_factor) : undefined,
      timestamp: balances[0].timestamp,
      balances: balances.map((balance) => ({
        address: balance.address,
        price: balance.price != null ? parseFloat(balance.price) : undefined,
        amount: balance.amount,
        balanceUSD: balance.balance_usd != null ? parseFloat(balance.balance_usd) : undefined,
        rewardUSD: balance.reward_usd != null ? parseFloat(balance.reward_usd) : undefined,
        debtUSD: balance.debt_usd != null ? parseFloat(balance.debt_usd) : undefined,
        category: balance.category,
        data: balance.data,
        apy: balance.apy != null ? parseFloat(balance.apy) : undefined,
        apyBase: balance.apy_base != null ? parseFloat(balance.apy_base) : undefined,
        apyReward: balance.apy_reward != null ? parseFloat(balance.apy_reward) : undefined,
        apyMean30d: balance.apy_mean_30d != null ? parseFloat(balance.apy_mean_30d) : undefined,
        ilRisk: balance.il_risk ?? undefined,
      })),
    })
  }

  return balancesGroups
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
            reward_usd,
            debt_usd,
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

/**
 * Update wallet balances in a transaction (delete previous and insert new ones)
 * @param client
 * @param address
 * @param balancesGroups
 * @param balances
 */
export async function updateBalances(
  client: PoolClient,
  address: string,
  balancesGroups: BalancesGroup[],
  balances: Balance[],
) {
  const backoffIntervalMs = 100
  const maxTries = 5
  let tries = 0

  // Do the transaction in a loop (with exponential backoff) to prevent Cockroach contention errors
  // See: https://www.cockroachlabs.com/docs/stable/transaction-retry-error-reference.html
  while (tries <= maxTries) {
    await client.query('BEGIN')

    tries++

    try {
      // Delete old balances
      await deleteBalancesGroupsCascadeByFromAddress(client, address)

      // Insert balances groups
      await insertBalancesGroups(client, balancesGroups)

      // Insert new balances
      await insertBalances(client, balances)

      await client.query('COMMIT')

      return
    } catch (err: any) {
      await client.query('ROLLBACK')

      console.error('Failed to insert balances: code', err.code)
      if (err.code !== '40001' || tries == maxTries) {
        throw err
      } else {
        console.error('Failed to insert balances, transaction contention retry', tries)
        await sleep(tries * backoffIntervalMs)
      }
    }
  }
}
