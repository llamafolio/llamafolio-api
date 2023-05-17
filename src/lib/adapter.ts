import type { Category } from '@lib/category'
import type { Chain } from '@lib/chains'

export interface BaseContext {
  chain: Chain
  adapterId: string
  blockHeight?: number
}

export interface BalancesContext extends BaseContext {
  address: string
}

export type ContractStandard = 'erc20' | 'erc721'

export interface BaseContract {
  // discriminators
  standard?: ContractStandard
  category?: Category

  name?: string
  displayName?: string
  chain: Chain
  address: string
  // if specified, used to retrieve token details: symbol / decimals
  token?: string
  symbol?: string
  decimals?: number
  stable?: boolean

  // DefiLlama yields API identifier. Matches pool or pool_old
  yieldKey?: string
}

export interface RawContract extends BaseContract {
  rewards?: string[]
  underlyings?: string[]
  [key: string | number]: any
}

export interface Contract extends BaseContract {
  rewards?: BaseContract[] | string[]
  underlyings?: BaseContract[] | string[]
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

export interface BalancesGroup {
  balances: Balance[]
  // Metadata
  healthFactor?: number
}

export interface BalancesConfig {
  groups: BalancesGroup[]
}

export interface ContractsMap {
  [key: string]: Contract | Contract[] | RawContract | RawContract[]
}

export interface ContractsConfig<C extends ContractsMap, P extends ContractsMap> {
  contracts: C
  props?: P
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
export type GetContractsHandler<C extends ContractsMap = ContractsMap, P extends ContractsMap = ContractsMap> = (
  ctx: BaseContext,
  revalidateProps: { [key: string]: any },
) => ContractsConfig<C, P> | Promise<ContractsConfig<C, P>>

export type GetBalancesHandler<C extends GetContractsHandler> = (
  ctx: BalancesContext,
  // each key can be undefined as the account may not have interacted with these contracts
  contracts: ExcludeRawContract<Partial<Awaited<ReturnType<C>>['contracts']>>,
  props: Awaited<ReturnType<C>>['props'],
) => BalancesConfig | Promise<BalancesConfig>

export interface AdapterHandler {
  getContracts: GetContractsHandler
  getBalances: GetBalancesHandler<GetContractsHandler>
}

export interface Adapter extends Partial<Record<Chain, AdapterHandler>> {
  /**
   * DefiLlama slug.
   * @see https://docs.llama.fi/list-your-project/submit-a-project to submit your adapter on DefiLlama.
   */
  id: string
}

/**
 * Tests
 */
export interface AdapterTest {
  address: string
  blockHeight: number
  expected: BalancesTest[]
}

export interface BalancesTest {
  amount?: bigint
  symbol?: string
  decimals?: string
  category: Category
  underlying?: { symbol?: string; decimals?: string; amount: bigint }[]
  rewards?: { symbol?: string; decimals?: string; amount: bigint }[]
}
