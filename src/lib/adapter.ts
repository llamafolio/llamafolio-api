import { sanitizeBalances } from '@lib/balance'
import { Category } from '@lib/category'
import { Chain, chains } from '@lib/chains'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'

export interface BaseContext {
  address: string
  blockHeight?: { [k: string]: number }
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
  underlyings?: BaseBalance[]
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

export interface Metadata {
  healthFactor?: number
}

export interface BalancesConfig {
  balances: Balance[]
  // Metadata
  arbitrum?: Metadata
  avax?: Metadata
  bsc?: Metadata
  celo?: Metadata
  ethereum?: Metadata
  fantom?: Metadata
  harmony?: Metadata
  polygon?: Metadata
  optimism?: Metadata
  xdai?: Metadata
}

export interface ContractsConfig {
  contracts: { [key: string]: Contract | Contract[] | undefined }
  revalidate?: number
}

export type GetContractsHandler = () => ContractsConfig | Promise<ContractsConfig>

export type GetBalancesHandler<C extends GetContractsHandler> = (
  ctx: BaseContext,
  contracts: Awaited<ReturnType<C>>['contracts'],
) => BalancesConfig | Promise<BalancesConfig>

export interface Adapter {
  /**
   * DefiLlama slug.
   * @see https://docs.llama.fi/list-your-project/submit-a-project to submit your adapter on DefiLlama.
   */
  id: string
  getContracts: GetContractsHandler
  getBalances: GetBalancesHandler<GetContractsHandler>
}

export function mergeAdapters(adapters: { [key: string]: Pick<Adapter, 'getContracts' | 'getBalances'> }) {
  const adapterKeys = Object.keys(adapters)

  const getContracts = async () => {
    const contracts: ContractsConfig['contracts'] = {}

    const adaptersContracts = await Promise.all(adapterKeys.map((key) => adapters[key].getContracts()))

    for (let i = 0; i < adapterKeys.length; i++) {
      for (const contractKey in adaptersContracts[i].contracts) {
        // prefix each contract key with the adapter key to preven any conflict on merged adapters
        const compositeKey = `${adapterKeys[i]}#${contractKey}`
        contracts[compositeKey] = adaptersContracts[i].contracts[contractKey]
      }
    }

    return {
      contracts,
    }
  }

  const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
    // group back contracts to their adapter (prefix key)
    // ex: { p0#k0: x0, p0#k1: x1, p1#k0: y0, ... } -> { p0: { k0: x0, k1: x1 }, p1: { k0: y0 } }
    const contractsByAdapterKey: { [key: string]: ContractsConfig['contracts'] } = {}
    for (const compositeKey in contracts) {
      const [adapterKey, ...rest] = compositeKey.split('#')
      // in case actual key contains separator
      const key = rest.join('#')

      if (!contractsByAdapterKey[adapterKey]) {
        contractsByAdapterKey[adapterKey] = {}
      }
      contractsByAdapterKey[adapterKey][key] = contracts[compositeKey]
    }

    const adaptersBalances = await Promise.all(
      adapterKeys.map((key) => adapters[key].getBalances(ctx, contractsByAdapterKey[key])),
    )

    const metadata: Omit<BalancesConfig, 'balances'> = {}
    const balances = adaptersBalances.flatMap((config) => config.balances).filter(isNotNullish)

    for (const chain of chains) {
      for (const config of adaptersBalances) {
        if (config[chain.id]) {
          metadata[chain.id] = { ...(metadata[chain.id] || {}), ...config[chain.id] }
        }
      }
    }

    return {
      ...metadata,
      balances,
    }
  }

  return {
    getContracts,
    getBalances,
  }
}

/**
 * Tests
 */

export interface AdapterTest {
  address: string
  blockHeight: { [k: string]: number }
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
