import environment from '@environment'
import type { Balance, BaseBalance, BaseContext, PricedBalance } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { type Chain, chainById, getRPCClient, toDefiLlamaChain } from '@lib/chains'
import { unixFromDate } from '@lib/fmt'
import { mulPrice, parseFloatBI, sum } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish, type UnixTimestamp } from '@lib/type'

// Defillama prices API requires a prefix to know where the token comes from
export function getTokenKey(contract: { chain: Chain; address: string; token?: string }) {
  if (!contract.token && !contract.address) {
    console.error(`getTokenKey missing address`, contract)
    return
  }
  return `${toDefiLlamaChain[contract.chain] || contract.chain}:${(contract.token || contract.address).toLowerCase()}`
}

interface CoinResponse {
  price: number
  symbol: string
  decimals?: number
  timestamp: number
}

interface PricesResponse {
  coins: {
    [key: string]: CoinResponse
  }
}

export async function fetchTokenPrices(keys: string[]): Promise<PricesResponse> {
  try {
    // sort to increase cache hits
    const coinsParam = keys.sort().join(',')
    const endpoint = environment.DEFILLAMA_PRICE_API_KEY
      ? `https://coins.llama.fi/prices/current/${coinsParam}?apikey=${environment.DEFILLAMA_PRICE_API_KEY}`
      : `https://coins.llama.fi/prices/current/${coinsParam}`
    const pricesRes = await fetch(endpoint, { method: 'GET' })

    if (!pricesRes.ok) {
      throw new Error(`bad response for coins ${coinsParam}`)
    }

    return pricesRes.json()
  } catch (error) {
    console.error('Failed to get DefiLlama current prices', error)
    return {
      coins: {},
    }
  }
}

export async function fetchHistoricalTokenPrices(keys: string[], timestamp: UnixTimestamp): Promise<PricesResponse> {
  try {
    // sort to increase cache hits
    const coinsParam = keys.sort().join(',')
    const endpoint = environment.DEFILLAMA_PRICE_API_KEY
      ? `https://coins.llama.fi/prices/historical/${timestamp}/${coinsParam}?apikey=${environment.DEFILLAMA_PRICE_API_KEY}&searchWidth=4h`
      : `https://coins.llama.fi/prices/historical/${timestamp}/${coinsParam}?searchWidth=4h`
    const pricesRes = await fetch(endpoint, { method: 'GET' })

    if (!pricesRes.ok) {
      throw new Error(`bad response for coins ${coinsParam}`)
    }

    return pricesRes.json()
  } catch (error) {
    console.error('Failed to get DefiLlama historical prices', error)
    return {
      coins: {},
    }
  }
}

// 1inch oracles
// See: https://github.com/1inch/spot-price-aggregator
const oneInchOracles: { [chainId: string]: `0x${string}` } = {
  42161: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // arbitrum
  1313161554: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // aurora
  43114: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // avalanche
  8453: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // base
  1: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // ethereum
  250: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // fantom
  100: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // gnosis
  10: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // optimism
  137: '0x0addd25a91563696d8567df78d5a01c9a991f9b8', // polygon
  324: '0xc9bb6e4ff7deea48e045ced9c0ce016c7cfbd500', // zksync-era
}

export async function getTokenPrices(tokens: Token[]): Promise<PricesResponse> {
  const keys = new Set(tokens.map(getTokenKey).filter(isNotNullish))

  return fetchTokenPrices(Array.from(keys))
}

export async function getTokenPrice(token: Token) {
  const tokenKey = getTokenKey(token)
  if (!tokenKey) {
    return null
  }

  const tokenPricesRes = await fetchTokenPrices([tokenKey])

  return tokenPricesRes.coins?.[tokenKey] ?? null
}

export async function getHistoricalTokenPrices<T extends Token>(
  tokens: T[],
  timestamp: UnixTimestamp,
): Promise<(T & { price?: number })[]> {
  const keys = new Set(tokens.map(getTokenKey).filter(isNotNullish))

  const pricesResponse = await fetchHistoricalTokenPrices(Array.from(keys), timestamp)

  return tokens.map((token) => {
    const key = getTokenKey(token)
    if (!key) {
      return { ...token }
    }

    const maybePrice = pricesResponse.coins[key]

    return {
      ...token,
      price: maybePrice?.price,
    }
  })
}

function getPricedBalance(balance: BaseBalance, prices: { [key: string]: CoinResponse }): PricedBalance {
  const key = getTokenKey(balance)
  if (!key) {
    console.log('Failed to get price token key for balance', balance)
    return balance
  }

  const price = prices[key]
  if (price === undefined) {
    console.log(
      `Failed to get price on Defillama API for ${key} - token name: ${balance.name} - token symbol: ${balance.symbol} - token chain: ${balance.chain}`,
    )
    return balance
  }

  const decimals = balance.decimals || price.decimals
  if (decimals === undefined) {
    console.log(`Failed to get decimals for ${key}`)
    return balance
  }

  return {
    ...price,
    ...balance,
    balanceUSD: mulPrice(balance.amount || 0n, Number(decimals), price.price),
    claimableUSD: balance.claimable ? mulPrice(balance.claimable || 0n, decimals, price.price) : undefined,
  }
}

export async function getPricedBalances(balances: Balance[]): Promise<(Balance | PricedBalance)[]> {
  const balancesByChain: { [chain: string]: Balance[] } = {}

  for (const balance of balances) {
    if (!balancesByChain[balance.chain]) {
      balancesByChain[balance.chain] = []
    }
    balancesByChain[balance.chain].push(balance)

    // add rewards
    if (balance.rewards) {
      for (const reward of balance.rewards) {
        if ((reward.amount && reward.amount > 0n) || (reward.claimable && reward.claimable > 0n)) {
          balancesByChain[balance.chain].push(reward as Balance)
        }
      }
    }

    // add underlyings
    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        const _underlying = underlying as BaseBalance
        if (_underlying.amount && _underlying.amount > 0n) {
          balancesByChain[balance.chain].push(_underlying as Balance)
        }
      }
    }
  }

  // add native currencies (denominators)
  for (const chain in balancesByChain) {
    const _chain = chainById[chain]
    if (_chain?.nativeCurrency) {
      balancesByChain[chain].push({ chain: chain as Chain, ..._chain.nativeCurrency } as Balance)
    }
  }

  // try prices on DefiLlama (cross-chains) first (reduce # of onchain calls)
  const defiLlamaKeys = new Set<string>()

  for (const chain in balancesByChain) {
    for (const balance of balancesByChain[chain]) {
      const key = getTokenKey(balance)
      if (key) {
        defiLlamaKeys.add(key)
      }
    }
  }

  const prices: { [key: string]: CoinResponse } = {}

  // too many tokens fail, break down into multiple calls
  const batchPrices = await Promise.all(sliceIntoChunks(Array.from(defiLlamaKeys), 150).map(fetchTokenPrices))
  for (const batchPrice of batchPrices) {
    for (const key in batchPrice.coins) {
      prices[key] = batchPrice.coins[key]
    }
  }

  // try onchain
  const unpricedBalancesByChain: { [chain: string]: Balance[] } = {}

  for (const chain in balancesByChain) {
    for (const balance of balancesByChain[chain]) {
      const key = getTokenKey(balance)
      if (key && !prices[key]) {
        if (!unpricedBalancesByChain[chain]) {
          unpricedBalancesByChain[chain] = []
        }
        unpricedBalancesByChain[chain].push(balance)
      }
    }
  }

  await Promise.all(
    Object.keys(unpricedBalancesByChain).map(async (chain) => {
      const _chain = chainById[chain]
      const nativeCurrencyKey = getTokenKey({ chain: chain as Chain, ..._chain.nativeCurrency } as Balance)
      if (!nativeCurrencyKey || !prices[nativeCurrencyKey]) {
        console.log(
          `Failed to get price on Defillama API for ${nativeCurrencyKey} - token name: ${_chain.nativeCurrency.name} - token symbol: ${_chain.nativeCurrency.symbol} - token chain: ${chain}`,
        )
        return
      }
      const nativeCurrencyPrice = prices[nativeCurrencyKey].price
      const balances = unpricedBalancesByChain[chain]
      const oracle = oneInchOracles[_chain.chainId]
      if (!oracle) {
        return
      }

      const ctx: BaseContext = { chain: chain as Chain, adapterId: '', client: getRPCClient({ chain: chain as Chain }) }

      const ratesToEth = await multicall({
        ctx,
        calls: unpricedBalancesByChain[chain].map((balance) => ({
          target: oracle,
          params: [balance.token || balance.address, true],
        })),
        abi: {
          inputs: [
            { internalType: 'contract IERC20', name: 'srcToken', type: 'address' },
            { internalType: 'bool', name: 'useSrcWrappers', type: 'bool' },
          ],
          name: 'getRateToEth',
          outputs: [{ internalType: 'uint256', name: 'weightedRate', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      })

      for (let idx = 0; idx < balances.length; idx++) {
        const balance = balances[idx]
        const rateToEthRes = ratesToEth[idx]
        if (!rateToEthRes.success) {
          continue
        }

        const key = getTokenKey(balance)
        if (key && balance.decimals) {
          const numerator = 10n ** BigInt(balance.decimals)
          const nativeCurrencyDecimals = BigInt(_chain.nativeCurrency.decimals)
          const denominator = 10n ** nativeCurrencyDecimals
          const priceInDenominator = parseFloatBI((rateToEthRes.output * numerator) / denominator, 18)

          prices[key] = {
            ...balance,
            price: priceInDenominator * nativeCurrencyPrice,
            timestamp: unixFromDate(new Date()),
          } as CoinResponse
        }
      }
    }),
  )

  const pricedBalances: (Balance | PricedBalance)[] = balances.map((balance) => {
    if (balance.rewards) {
      const pricedRewards = balance.rewards.map((reward) => getPricedBalance(reward, prices))
      balance.rewards = pricedRewards
    }

    if (balance.underlyings) {
      const pricedUnderlyings = balance.underlyings.map((underlying) => getPricedBalance(underlying, prices))
      return {
        ...balance,
        balanceUSD: sum(pricedUnderlyings.map((b) => b.balanceUSD || 0)),
        underlyings: pricedUnderlyings,
      }
    }

    return getPricedBalance(balance, prices)
  })

  return pricedBalances
}

export function isPricedBalance(balance: Balance | PricedBalance): balance is PricedBalance {
  return (balance as PricedBalance).price != null
}
