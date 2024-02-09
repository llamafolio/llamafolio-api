import type { ClickHouseClient } from '@clickhouse/client'
import {
  type Adapter as DBAdapter,
  insertAdapters,
  selectAdapter,
  selectNonDuplicateAdaptersContracts,
} from '@db/adapters'
import { flattenContracts, insertAdaptersContracts } from '@db/contracts'
import type { Cache } from '@lib/cache'
import type { Category } from '@lib/category'
import { type Chain, chainById, getRPCClient } from '@lib/chains'
import { fetchProtocolToParentMapping } from '@lib/protocols'
import { resolveContractsTokens } from '@lib/token'
import isEqual from 'lodash/isEqual'
import type { PublicClient } from 'viem'

export interface BaseContext {
  cache?: Cache<string, any>
  client: PublicClient
  chain: Chain
  adapterId: string
  blockNumber?: number
}

export interface BalancesContext extends BaseContext {
  address: `0x${string}`
}

export type ContractStandard = 'erc20' | 'erc721' | 'erc1155'

export interface BaseContract {
  // discriminators
  standard?: ContractStandard
  category?: Category

  name?: string
  chain: Chain
  address: `0x${string}`
  token?: `0x${string}`
  symbol?: string
  decimals?: number
  stable?: boolean

  // DefiLlama yields API identifier. Matches pool or pool_old
  yieldKey?: string
}

export interface RawContract extends BaseContract {
  // "raw" tokens
  rewards?: `0x${string}`[]
  underlyings?: `0x${string}`[]
  [key: string | number]: any
}

export interface Contract extends BaseContract {
  rewards?: BaseContract[] | `0x${string}`[]
  underlyings?: BaseContract[] | `0x${string}`[]
  [key: string | number]: any
}

export interface BaseBalance extends BaseContract {
  amount: bigint
  claimable?: bigint
}

export interface BasePricedBalance extends BaseBalance {
  price: number
  balanceUSD?: number
  claimableUSD?: number

  // price updated at
  timestamp: number
}

export interface RootBaseBalance extends BaseBalance {
  // optional rewards
  rewards?: BaseBalance[]
  // optional underlying tokens.
  // ex: aToken -> token (AAVE)
  // ex: Uniswap Pair -> [token0, token1]
  underlyings?: BaseBalance[] | BaseContract[]
}

export interface WalletBalance extends RootBaseBalance {
  category: 'wallet'
}

export interface LendBalance extends RootBaseBalance {
  category: 'lend'
  // Note: 18 decimals
  collateralFactor?: bigint
  MCR?: number // Minimum Collateralization Ratio
}

export interface BorrowBalance extends RootBaseBalance {
  category: 'borrow'
}

export interface StakeBalance extends RootBaseBalance {
  category: 'stake'
}

export interface VestBalance extends RootBaseBalance {
  category: 'vest'
  // Unix timestamp
  unlockAt?: number
}

export interface LockBalance extends RootBaseBalance {
  category: 'lock'
  // Unix timestamp
  unlockAt?: number
}

export interface LpBalance extends RootBaseBalance {
  category: 'lp'
}

export interface FarmBalance extends RootBaseBalance {
  category: 'farm'
}

export interface RewardBalance extends RootBaseBalance {
  category: 'reward'
  // TODO: rates interface
  rates?: any
}

export interface PerpetualBalance extends RootBaseBalance {
  category: 'perpetual'
}

export type Balance =
  | WalletBalance
  | LendBalance
  | BorrowBalance
  | StakeBalance
  | VestBalance
  | LockBalance
  | LpBalance
  | FarmBalance
  | RewardBalance
  | PerpetualBalance

export interface PricedBalance extends BasePricedBalance {
  rewards?: BasePricedBalance[]
  underlyings?: BasePricedBalance[]
  type?: string
}

export type WithPrice<T extends BaseBalance> = T & {
  rewards?: WithPrice<BaseBalance>
  underlyings?: WithPrice<BaseBalance>
}

export interface BalancesGroup {
  balances: Balance[]
  // Metadata
  MCR?: number // Minimum Collateralization Ratio
  healthFactor?: number
}

export interface BalancesConfig {
  groups: BalancesGroup[]
}

export interface ContractsMap {
  [key: string]: Contract | Contract[] | RawContract | RawContract[]
}

export interface ContractsConfig<C extends ContractsMap> {
  contracts: C
  revalidate?: number
  revalidateProps?: { [key: string]: any }
}

/**
 * RawContract is automatically mapped to Contract
 */
export type ExcludeRawContract<T> = {
  [P in keyof T]: Exclude<T[P], RawContract | RawContract[]>
}

/**
 * Pass previous `revalidateProps` passed to `getContracts` handler to know where the previous revalidate process ended.
 */
export type GetContractsHandler<C extends ContractsMap = ContractsMap> = (
  ctx: BaseContext,
  revalidateProps: { [key: string]: any },
) => ContractsConfig<C> | Promise<ContractsConfig<C>>

export type GetBalancesHandler<C extends GetContractsHandler> = (
  ctx: BalancesContext,
  // each key can be undefined as the account may not have interacted with these contracts
  contracts: ExcludeRawContract<Partial<Awaited<ReturnType<C>>['contracts']>>,
) => BalancesConfig | Promise<BalancesConfig>

export interface AdapterConfig {
  /**
   * Version to manage adapter implementation breaking changes
   */
  version?: number
  startDate?: number
}

export interface AdapterHandler {
  getContracts: GetContractsHandler
  getBalances: GetBalancesHandler<GetContractsHandler>
  config: AdapterConfig
}

export interface Adapter extends Partial<Record<Chain, AdapterHandler>> {
  /**
   * DefiLlama slug.
   * @see https://docs.llama.fi/list-your-project/submit-a-project to submit your adapter on DefiLlama.
   */
  id: string
}

/**
 * @param client
 * @param adapter
 * @param chain
 * @param prevDbAdapter
 * @param protocolToParent
 * @return null if no more contracts to insert
 */
export async function revalidateAdapterContracts(
  client: ClickHouseClient,
  adapter: Adapter,
  chain: Chain,
  prevDbAdapter: DBAdapter | null,
  protocolToParent: { [key: string]: string },
) {
  const chainId = chainById[chain]?.chainId
  if (!chainId) {
    return null
  }

  const now = new Date()

  const ctx: BaseContext = { chain, adapterId: adapter.id, client: getRPCClient({ chain }) }

  const config = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

  // Don't look further if revalidateProps are identical (reached the end)
  if (
    config.revalidateProps &&
    prevDbAdapter?.contractsRevalidateProps &&
    isEqual(config.revalidateProps, prevDbAdapter?.contractsRevalidateProps)
  ) {
    return null
  }

  const contracts = await resolveContractsTokens(ctx, config.contracts || {})

  let expire_at: Date | undefined = undefined
  if (config.revalidate) {
    expire_at = new Date(now)
    expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
  }

  const adaptersValues: DBAdapter[] = []
  // Collapse previous state
  if (prevDbAdapter != null) {
    adaptersValues.push({ ...prevDbAdapter, sign: -1 })
  }

  const newAdapter = {
    id: adapter.id,
    parentId: protocolToParent[adapter.id] || '',
    chain,
    contractsExpireAt: expire_at,
    contractsRevalidateProps: config.revalidateProps,
    createdAt: prevDbAdapter?.createdAt || now,
    updatedAt: now,
    version: adapter[chain]?.config?.version || 0,
    sign: 1,
  } as DBAdapter

  // State
  adaptersValues.push(newAdapter)

  await insertAdapters(client, adaptersValues)

  // Insert new contracts
  // add context to contracts
  const adapterContracts = flattenContracts(contracts).map((contract) => ({
    chain,
    adapterId: adapter.id,
    timestamp: now,
    version: adapter[chain]?.config?.version || 0,
    sign: 1,
    ...contract,
  }))

  // prevent duplicates (contracts table is append-only)
  const nonDuplicateAdaptersContracts = await selectNonDuplicateAdaptersContracts(
    client,
    adapter.id,
    chainId,
    adapterContracts,
  )

  console.log(`Skipped ${adapterContracts.length - nonDuplicateAdaptersContracts.length} already existing contracts`)

  if (nonDuplicateAdaptersContracts.length === 0) {
    // already stored, stop recursion
    return null
  }

  console.log(`Inserting ${nonDuplicateAdaptersContracts.length} new contracts`)

  await insertAdaptersContracts(client, nonDuplicateAdaptersContracts)

  return newAdapter
}

/**
 * Recursively revalidate contracts of a chain for a given adapter until completion
 */
export async function revalidateAllContracts(client: ClickHouseClient, adapter: Adapter, chain: Chain) {
  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    console.error(`Missing chain ${chain}`)
    return
  }

  let prevDbAdapter = await selectAdapter(client, adapter.id, chainId)

  const protocolToParent = await fetchProtocolToParentMapping()

  for (let i = 0; ; i++) {
    prevDbAdapter = await revalidateAdapterContracts(client, adapter, chain, prevDbAdapter, protocolToParent)
    if (!prevDbAdapter) {
      return console.log('Done')
    }
  }
}
