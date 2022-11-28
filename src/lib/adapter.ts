import { sanitizeBalances } from '@lib/balance'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

/**
 * Wrapper to common libraries for different named methods
 */
export interface MethodWithAbi {
  method: string
  abi: any
}

export interface BaseContext {
  address: string
  blockHeight?: { [k: string]: number | string }
}

export type ContractType = 'reward' | 'debt' | 'underlying'
export type ContractStandard = 'erc20' | 'erc721'

export interface BaseContract {
  // discriminators
  type?: ContractType
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
  rewards?: BaseContract[]
  underlyings?: BaseContract[]
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
}

export interface Lock {
  // Unix timestamp
  end?: number
}

export interface BalancesConfig {
  balances: Balance[]
  // Metadata
  healthFactor?: number
}

export interface ContractsConfig {
  contracts: { [key: string]: Contract | Contract[] | RawContract | RawContract[] | undefined }
  revalidate?: number
}

export type GetContractsHandler = () => ContractsConfig | Promise<ContractsConfig>

export type GetBalancesHandler<C extends GetContractsHandler> = (
  ctx: BaseContext,
  // each key can be undefined as the account may not have interacted with these contracts
  contracts: Partial<Awaited<ReturnType<C>>['contracts']>,
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
  chain: Chain
  blockHeight: { [k: string]: number | string }
  expected: { [k: string]: BalancesTest[] }
}

export interface BalancesTest {
  amount?: string
  symbol?: string
  category?: string
  underlying?: { symbol?: string; amount: string }[]
  rewards?: { symbol?: string; amount: string }[]
}

export const parseBalancesTest = (balancesConfig: BalancesConfig): BalancesTest => {
  const chains = balancesConfig.balances
    .map((balances) => balances.chain)
    .filter((chain, i, chains) => chains.indexOf(chain) === i)

  const balances: { [k: string]: BalancesTest[] } = {}

  for (const chain of chains) {
    balances[chain] = []
    sanitizeBalances(balancesConfig.balances).map((balance) => {
      if (balance.chain === chain && balance.amount.toString() !== '0') {
        const data: BalancesTest = {
          amount: balance.amount.toString(),
          symbol: balance.symbol,
          category: balance.category,
        }

        if (balance.underlyings) {
          data.underlying = balance.underlyings.map((underlying) => {
            return { amount: underlying.amount.toString(), symbol: underlying.symbol }
          })
        }

        if (balance.rewards) {
          data.rewards = balance.rewards.map((reward) => {
            return { amount: reward.amount.toString(), symbol: reward.symbol }
          })
        }

        balances[chain].push(data)
      }
    })
  }

  return balances
}
