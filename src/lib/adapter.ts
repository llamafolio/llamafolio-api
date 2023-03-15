import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

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
  amount: BigNumber
  claimable?: BigNumber
}

export interface BasePricedBalance extends BaseBalance {
  price: number
  balanceUSD: number
  claimableUSD?: number

  // price updated at
  timestamp: number
}

export interface Balance extends BaseBalance {
  // optional rewards
  rewards?: BaseBalance[]
  // optional underlying tokens.
  // ex: aToken -> token (AAVE)
  // ex: Uniswap Pair -> [token0, token1]
  underlyings?: BaseBalance[] | BaseContract[]
  lock?: Lock
  vest?: Vest
}

export interface RewardBalance extends Balance {
  // claimable amount. Can be lower than balance amount but not higher.
  // ex: vested reward of 1000 but only 100 currently claimable.
  claimable: BigNumber
  // TODO: rewards interface
  rates?: any
}

export interface PricedBalance extends BasePricedBalance {
  rewards?: BasePricedBalance[]
  underlyings?: BasePricedBalance[]
  vest?: { claimable: BigNumber }
  type?: string
}

export interface Lock {
  // Unix timestamp
  end?: number
}

export interface Vest {
  // Claimable balance
  claimable?: BigNumber
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
  amount?: BigNumber
  symbol?: string
  decimals?: string
  category: Category
  underlying?: { symbol?: string; decimals?: string; amount: BigNumber }[]
  rewards?: { symbol?: string; decimals?: string; amount: BigNumber }[]
}
