import type { Balance, BaseBalance, PricedBalance } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { toDefiLlamaChain, type Chain } from '@lib/chains'
import { mulPrice, sum } from '@lib/math'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

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
  balances = balances.filter(
    (balance) =>
      balance.amount > 0n ||
      (balance.claimable && balance.claimable > 0n) ||
      (balance.rewards && balance.rewards.some((reward) => reward.amount > 0n)),
  )

  const priced: BaseBalance[] = balances.slice()

  // add rewards
  for (const balance of balances) {
    if (balance.rewards) {
      for (const reward of balance.rewards) {
        if ((reward.amount && reward.amount > 0n) || (reward.claimable && reward.claimable > 0n)) {
          priced.push(reward)
        }
      }
    }
  }

  // add underlyings
  for (const balance of balances) {
    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        const _underlying = underlying as BaseBalance
        if (_underlying.amount && _underlying.amount > 0n) {
          priced.push(_underlying)
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
    const key = getTokenKey(balance)
    if (!key) {
      console.log('Failed to get price token key for balance', balance)
      return balance
    }

    const price = prices[key]
    if (price === undefined) {
      console.log(`Failed to get price on Defillama API for ${key}`)
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
      priceTimestamp: price.timestamp ? new Date(price.timestamp * 1000) : undefined,
      balanceUSD: mulPrice(balance.amount, Number(decimals), price.price),
      claimableUSD: balance.claimable ? mulPrice(balance.claimable || 0n, decimals, price.price) : undefined,
    }
  }

  const pricedBalances: (Balance | PricedBalance)[] = balances.map((balance) => {
    if (balance.rewards) {
      const pricedRewards = balance.rewards.map(getPricedBalance)
      balance.rewards = pricedRewards
    }
    if (balance.underlyings) {
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
