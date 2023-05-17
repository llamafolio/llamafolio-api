import type { Balance, BaseBalance, PricedBalance } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { BigInt_ZERO, mulPrice, sum } from '@lib/math'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

// Defillama prices API requires a prefix to know where the token comes from.
// It can be a chain or a market provider like coingecko
export function getTokenKey(token: Token) {
  if (token.coingeckoId) {
    return `coingecko:${token.coingeckoId}`
  }

  if (token.chain && token.priceSubstitute) {
    return `${token.chain}:${token.priceSubstitute.toLowerCase()}`
  }

  if (token.chain && token.address) {
    return `${token.chain}:${token.address.toLowerCase()}`
  }
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
    const coinsParam = keys.join(',')

    const pricesRes = await fetch(`https://coins.llama.fi/prices/current/${coinsParam}`, {
      method: 'GET',
    })

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

export async function getPricedBalances(balances: Balance[]): Promise<(Balance | PricedBalance)[]> {
  // Filter empty balances
  balances = balances.filter((balance) => Number(balance.amount) > 0 || Number(balance.claimable) > 0)
  console.log(`[getPricedBalances] balances: [${balances.length}]`)

  const priced: BaseBalance[] = balances.slice()

  // add rewards
  for (const balance of balances) {
    if (balance.rewards) {
      for (const reward of balance.rewards) {
        if (Number(reward.amount) > 0 || Number(reward.claimable) > 0) {
          priced.push(reward)
        }
      }
    }
  }

  // add underlyings
  for (const balance of balances) {
    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        // @ts-ignore
        if (Number(underlying.amount) > 0) {
          // @ts-ignore
          priced.push(underlying)
        }
      }
    }
  }

  const prices: { [key: string]: CoinResponse } = {}

  // too many tokens fail, break down into multiple calls
  const batchPrices = await Promise.all(sliceIntoChunks(priced as Token[], 150).map(getTokenPrices))
  for (const batchPrice of batchPrices) {
    for (const key in batchPrice.coins) {
      prices[key] = batchPrice.coins[key]
    }
  }

  function getPricedBalance(balance: BaseBalance): PricedBalance {
    const key = getTokenKey(balance as Token)
    if (!key) {
      console.log('Failed to get price token key for balance', balance)
      // @ts-ignore
      return balance
    }

    const price = prices[key]
    if (price === undefined) {
      console.log(`Failed to get price on Defillama API for ${key}`)
      // @ts-ignore
      return balance
    }

    const decimals = balance.decimals || price.decimals
    if (decimals === undefined) {
      console.log(`Failed to get decimals for ${key}`)
      // @ts-ignore
      return balance
    }

    return {
      ...price,
      ...balance,
      // @ts-ignore
      priceTimestamp: price.timestamp ? new Date(price.timestamp * 1000) : undefined,
      balanceUSD: mulPrice(balance.amount, decimals, price.price),
      claimableUSD: balance.claimable ? mulPrice(balance.claimable || BigInt_ZERO, decimals, price.price) : undefined,
    }
  }

  const pricedBalances: (Balance | PricedBalance)[] = balances.map((balance) => {
    if (balance.rewards) {
      const pricedRewards = balance.rewards.map(getPricedBalance)
      balance.rewards = pricedRewards
    }
    if (balance.underlyings) {
      // @ts-ignore
      const pricedUnderlyings = balance.underlyings.map(getPricedBalance)
      return {
        ...balance,
        balanceUSD: sum(pricedUnderlyings.map((b) => b.balanceUSD || 0)),
        underlyings: pricedUnderlyings,
      }
    }

    return getPricedBalance(balance)
  })

  return pricedBalances
}
