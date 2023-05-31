import { adapterById } from '@adapters'
import { selectDefinedAdaptersContractsProps } from '@db/adapters'
import type { Balance as BalanceStore } from '@db/balances'
import { updateBalances as updateDBBalances } from '@db/balances'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import type {
  Balance,
  BalancesConfig,
  BalancesContext,
  BalancesGroup,
  BaseBalance,
  BaseContract,
  ExcludeRawContract,
  GetContractsHandler,
  PricedBalance,
} from '@lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '@lib/array'
import type { Category } from '@lib/category'
import type { Chain } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20BalanceOf } from '@lib/erc20'
import { sum } from '@lib/math'
import { multicall } from '@lib/multicall'
import { getPricedBalances } from '@lib/price'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import type { PoolClient } from 'pg'
import { v4 as uuidv4 } from 'uuid'

export async function getBalances(ctx: BalancesContext, contracts: BaseContract[]) {
  const coins: Token[] = []
  const tokensByChain: { [key: string]: Token[] } = {}

  for (const token of contracts) {
    // native chain coin
    if (token.address === ADDRESS_ZERO) {
      coins.push(token as Token)
      continue
    }

    // token
    if (!tokensByChain[token.chain]) {
      tokensByChain[token.chain] = []
    }
    tokensByChain[token.chain]?.push(token as Token)
  }

  const coinsBalances = (
    await Promise.all(
      coins.map(async (token) => {
        try {
          const provider = providers[token.chain]
          const balance = await provider.getBalance(ctx.address)
          ;(token as BaseBalance).amount = balance
          return token
        } catch (err) {
          console.error(`Failed to get coin balance for chain ${token.chain}`, err)
          return null
        }
      }),
    )
  ).filter(isNotNullish)

  const tokensBalances: Token[] = (
    await Promise.all(Object.keys(tokensByChain).map((chain) => getERC20BalanceOf(ctx, tokensByChain[chain])))
  ).flat() as Token[]

  return coinsBalances.concat(tokensBalances)
}

export async function multicallBalances(params: any) {
  const chain = params.ctx.chain
  const coinsCallsAddresses: string[] = []
  const tokensCalls = []
  const res = []

  for (const call of params.calls) {
    if (call.target === ADDRESS_ZERO) {
      // native chain coin
      // @ts-ignore
      coinsCallsAddresses.push(call.params[0])
    } else {
      // token
      tokensCalls.push(call)
    }
  }

  const coinsBalancesRes = await Promise.all(
    coinsCallsAddresses.map(async (address) => {
      try {
        const provider = providers[chain]
        const balance = await provider.getBalance(address)
        return balance
      } catch (err) {
        console.error(`Failed to get coin balance for chain ${chain}`, err)
        return null
      }
    }),
  )

  const tokensBalancesRes = await multicall({
    ctx: params.ctx,
    calls: tokensCalls,
    abi: params.abi,
  })

  let coinIdx = 0
  let tokenIdx = 0
  for (let i = 0; i < params.calls.length; i++) {
    const call = params.calls[i]

    if (call.target === ADDRESS_ZERO) {
      // native chain coin
      res.push({
        success: coinsBalancesRes[coinIdx] != null,
        // @ts-ignore
        input: call,
        output: coinsBalancesRes[coinIdx]?.toString(),
      })
      coinIdx++
    } else {
      // token
      res.push(tokensBalancesRes[tokenIdx])
      tokenIdx++
    }
  }

  return res
}

export function sanitizeBalances(balances: Balance[]) {
  const sanitizedBalances: Balance[] = []

  for (const balance of balances) {
    if (balance.amount == null) {
      console.error(`Missing balance amount`, balance)
      continue
    }

    const sanitizedBalance = { ...balance }

    if (balance.underlyings) {
      if (balance.underlyings.length === 1 && (balance.underlyings?.[0] as Balance).amount == null) {
        if (balance.decimals && balance.underlyings[0].decimals) {
          const deltaMantissa = balance.decimals - balance.underlyings[0].decimals
          const deltaMantissaAbs = Math.abs(deltaMantissa)

          sanitizedBalance.underlyings = balance.underlyings.map((underlying) => ({
            ...underlying,
            amount:
              deltaMantissa > 0
                ? balance.amount / 10n ** BigInt(deltaMantissaAbs)
                : balance.amount * 10n ** BigInt(deltaMantissaAbs),
          }))
        }
      }
    }

    if (balance.rewards) {
      sanitizedBalance.rewards = balance.rewards.map((reward) => ({ ...reward, amount: reward.amount || 0n }))
    }

    sanitizedBalances.push(sanitizedBalance)
  }

  return sanitizedBalances
}

export async function resolveBalances<C extends GetContractsHandler>(
  ctx: BalancesContext,
  contracts: ExcludeRawContract<Partial<Awaited<ReturnType<C>>['contracts']>>,
  resolvers: {
    [key in keyof Partial<Awaited<ReturnType<C>>['contracts']>]: (
      ctx: BalancesContext,
      contracts: ExcludeRawContract<Awaited<ReturnType<C>>['contracts']>[key],
    ) =>
      | Promise<Balance | Balance[] | Balance[][] | null | undefined>
      | Balance
      | Balance[]
      | Balance[][]
      | null
      | undefined
  },
) {
  const contractKeys = Object.keys(contracts)
  const balances = await Promise.all(
    contractKeys
      .filter((contractKey) => resolvers[contractKey] != null && contracts[contractKey] != null)
      .map(async (contractKey) => {
        try {
          const resolver = resolvers[contractKey]
          const balances = await resolver(ctx, contracts[contractKey]!)
          return balances
        } catch (error) {
          // Catch execution errors in adapters getBalances
          console.error(`[${ctx.adapterId}][${ctx.chain}] resolver ${contractKey} failed`, error)
          return null
        }
      }),
  )
  return balances.flat(2).filter(isNotNullish)
}

export function isBalanceUSDGtZero(balance: Balance | PricedBalance) {
  if ((balance as PricedBalance).price != null && ((balance as PricedBalance).balanceUSD || 0) > 1e-5) {
    return true
  }

  if (balance.underlyings) {
    for (const underlying of balance.underlyings) {
      if (((underlying as PricedBalance).price != null && (underlying as PricedBalance).balanceUSD) || 0 > 1e-5) {
        return true
      }
    }
  }

  if (balance.rewards) {
    for (const reward of balance.rewards) {
      if (
        (reward as PricedBalance).price != null &&
        (((reward as PricedBalance).claimableUSD || 0) > 0 || ((reward as PricedBalance).balanceUSD || 0) > 1e-5)
      ) {
        return true
      }
    }
  }

  return false
}

export interface SortBalance {
  balanceUSD?: number
  rewards?: SortBalance[]
  underlyings?: SortBalance[]
}

export function sortBalances(a: SortBalance, b: SortBalance) {
  if (a.rewards) {
    a.rewards = a.rewards.sort(sortBalances)
  }
  if (a.underlyings) {
    a.underlyings = a.underlyings.sort(sortBalances)
  }

  const aUSD = a.balanceUSD || 0
  const bUSD = b.balanceUSD || 0

  return bUSD - aUSD
}

export interface SumBalance {
  category?: Category
  claimableUSD?: number
  balanceUSD?: number
}

export function sumBalances(balances: SumBalance[]) {
  let res = 0

  for (const balance of balances) {
    // substract debt positions
    if (balance.category === 'borrow') {
      res -= balance.balanceUSD || 0
    } else {
      res += balance.claimableUSD || balance.balanceUSD || 0
    }
  }

  return res
}

export interface BalanceBreakdown {
  balanceUSD?: number
  debtUSD?: number
  rewardUSD?: number
}

/**
 * Get debt, claimable and total of given balance
 */
export function fmtBalanceBreakdown(balance: PricedBalance): PricedBalance & BalanceBreakdown {
  let balanceUSD = 0
  let debtUSD = 0
  let rewardUSD = 0

  if (balance.category === 'borrow') {
    debtUSD += balance.balanceUSD || 0
  } else if (balance.category === 'reward') {
    rewardUSD += balance.claimableUSD || balance.balanceUSD || 0
  } else {
    balanceUSD += balance.balanceUSD || 0
  }

  // nested rewards
  if (balance.rewards) {
    for (const reward of balance.rewards) {
      rewardUSD += reward.claimableUSD || reward.balanceUSD || 0
    }
  }

  return {
    ...balance,
    balanceUSD: balanceUSD || undefined,
    debtUSD: debtUSD || undefined,
    rewardUSD: rewardUSD || undefined,
  }
}

export const BALANCE_UPDATE_THRESHOLD = 5 * 60 * 1000

/**
 * At the moment, balances are considered "stale" if they haven't been updated in the last x minutes.
 * Later, we can use more advanced strategies using transactions events, scheduled updates etc
 * @param lastUpdateTimestamp
 */
export function areBalancesStale(lastUpdateTimestamp: number) {
  const now = new Date().getTime()

  return now - lastUpdateTimestamp > BALANCE_UPDATE_THRESHOLD
}

type ExtendedBalance = (Balance | PricedBalance) & {
  adapterId: string
  groupIdx: number
}

interface BalancesGroupExtended {
  balances: ExtendedBalance[]
  healthFactor?: number
}

interface ExtendedBalancesConfig extends BalancesConfig {
  adapterId: string
  chain: Chain
  groups: BalancesGroupExtended[]
}

/**
 *
 * @param client must be connected
 * @param address
 */
export async function updateBalances(client: PoolClient, address: `0x${string}`) {
  // Fetch all protocols (with their associated contracts) that the user interacted with
  // and all unique tokens he received
  const [contracts, adaptersContractsProps] = await Promise.all([
    getAllContractsInteractions(client, address),
    selectDefinedAdaptersContractsProps(client),
  ])

  const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')
  const adaptersContractsPropsByIdChain = keyBy2(adaptersContractsProps, 'id', 'chain')
  // add adapters with contracts_props, even if there was no user interaction with any of the contracts
  for (const adapter of adaptersContractsProps) {
    if (!contractsByAdapterIdChain[adapter.id]) {
      contractsByAdapterIdChain[adapter.id] = {}
    }
    if (!contractsByAdapterIdChain[adapter.id][adapter.chain]) {
      contractsByAdapterIdChain[adapter.id][adapter.chain] = []
    }
  }

  const adapterIds = Object.keys(contractsByAdapterIdChain)
  // list of all [adapterId, chain]
  const adapterIdsChains = adapterIds.flatMap((adapterId) =>
    Object.keys(contractsByAdapterIdChain[adapterId]).map((chain) => [adapterId, chain] as [string, Chain]),
  )

  console.log('Interacted with protocols:', adapterIds)

  // Run adapters `getBalances` only with the contracts the user interacted with
  const adaptersBalancesConfigsRes = await Promise.all(
    adapterIdsChains.map(async ([adapterId, chain]) => {
      const adapter = adapterById[adapterId]
      if (!adapter) {
        console.error(`Could not find adapter with id`, adapterId)
        return
      }
      const handler = adapter[chain]
      if (!handler) {
        console.error(`Could not find chain handler for`, [adapterId, chain])
        return
      }

      try {
        const hrstart = process.hrtime()

        const contracts = groupContracts(contractsByAdapterIdChain[adapterId][chain]) || []
        const props = adaptersContractsPropsByIdChain[adapterId]?.[chain]?.contractsProps || {}

        const ctx: BalancesContext = { address, chain, adapterId }

        const balancesConfig = await handler.getBalances(ctx, contracts, props)

        const hrend = process.hrtime(hrstart)

        const balancesLength = balancesConfig.groups.reduce((acc, group) => acc + (group.balances?.length || 0), 0)
        console.log(
          `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesLength} balances in %ds %dms`,
          hrend[0],
          hrend[1] / 1000000,
        )

        const extendedBalancesConfig: ExtendedBalancesConfig = {
          ...balancesConfig,
          // Tag balances with adapterId abd groupIdx
          groups: balancesConfig.groups.map((balancesGroup, groupIdx) => ({
            ...balancesGroup,
            balances: balancesGroup.balances.map((balance) => ({ ...balance, adapterId, groupIdx })),
          })),
          adapterId,
          chain,
        }

        return extendedBalancesConfig
      } catch (error) {
        console.error(`[${adapterId}][${chain}]: Failed to getBalances`, error)
        return
      }
    }),
  )

  const adaptersBalancesConfigs = adaptersBalancesConfigsRes.filter(isNotNullish)

  // Ungroup balances to make only 1 call to the price API
  const balances: ExtendedBalance[] = []
  for (const balancesConfig of adaptersBalancesConfigs) {
    for (const group of balancesConfig.groups) {
      for (const balance of group.balances) {
        balances.push(balance)
      }
    }
  }

  const sanitizedBalances = sanitizeBalances(balances)

  const hrstart = process.hrtime()

  const pricedBalances = await getPricedBalances(sanitizedBalances)

  const hrend = process.hrtime(hrstart)

  console.log(
    `getPricedBalances ${sanitizedBalances.length} balances, found ${pricedBalances.length} balances in %ds %dms`,
    hrend[0],
    hrend[1] / 1000000,
  )

  // Group balances back by adapter/chain
  const pricedBalancesByAdapterIdChain = groupBy2(pricedBalances, 'adapterId', 'chain')

  const now = new Date()

  const balancesGroupsStore: BalancesGroup[] = []
  const balancesStore: BalanceStore[] = []

  for (const balanceConfig of adaptersBalancesConfigs) {
    const pricedBalances = pricedBalancesByAdapterIdChain[balanceConfig.adapterId]?.[balanceConfig.chain]
    if (!pricedBalances || pricedBalances.length === 0) {
      continue
    }

    const balancesByGroupIdx = groupBy(pricedBalances.filter(isNotNullish), 'groupIdx')

    for (let groupIdx = 0; groupIdx < balanceConfig.groups.length; groupIdx++) {
      const balances = balancesByGroupIdx[groupIdx]
      if (!balances || balances.length === 0) {
        continue
      }

      const id = uuidv4()

      const groupBalances = balances.map((balance) => ({ groupId: id, ...fmtBalanceBreakdown(balance) }))

      for (const balance of groupBalances) {
        balancesStore.push(balance)
      }

      const balancesGroup: BalancesGroup = {
        id,
        fromAddress: address,
        adapterId: balanceConfig.adapterId,
        chain: balanceConfig.chain,
        balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
        rewardUSD: sum(groupBalances.map((balance) => balance.rewardUSD || 0)),
        debtUSD: sum(groupBalances.map((balance) => balance.debtUSD || 0)),
        timestamp: now,
        healthFactor: balanceConfig.groups[groupIdx].healthFactor,
      }

      balancesGroupsStore.push(balancesGroup)
    }
  }

  // Update balances
  return updateDBBalances(client, address, balancesGroupsStore, balancesStore)
}
