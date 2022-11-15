import { Balance, BaseBalance, PricedBalance, RewardBalance } from '@lib/adapter'
import { BN_ZERO, mulPrice, sum } from '@lib/math'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import fetch from 'node-fetch'

// Defillama prices API requires a prefix to know where the token comes from.
// It can be a chain or a market provider like coingecko
function getTokenKey(token: Token) {
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

interface PricesResponse {
  coins: {
    [key: string]: {
      price: number
      symbol: string
      decimals?: number
      timestamp: number
    }
  }
}

export async function getTokenPrices(tokens: Token[]): Promise<PricesResponse> {
  const pricesRes = await fetch('https://coins.llama.fi/prices', {
    method: 'POST',
    body: JSON.stringify({
      coins: tokens.map(getTokenKey).filter(isNotNullish),
    }),
  })
  return pricesRes.json()
}

export async function getPricedBalances(balances: Balance[]): Promise<PricedBalance[]> {
  // Filter empty balances
  balances = balances.filter((balance) => balance.amount.gt(0) || (balance as RewardBalance).claimable?.gt(0))

  const priced: BaseBalance[] = balances.slice()

  // add rewards
  for (const balance of balances) {
    if (balance.rewards) {
      for (const reward of balance.rewards) {
        if (reward.amount?.gt(0) || (reward as RewardBalance).claimable?.gt(0)) {
          priced.push(reward)
        }
      }
    }
  }

  // add underlyings
  for (const balance of balances) {
    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        if (underlying.amount?.gt(0)) {
          priced.push(underlying)
        }
      }
    }
  }

  const prices = await getTokenPrices(priced as Token[])

  function getPricedBalance(balance: BaseBalance): PricedBalance {
    const key = getTokenKey(balance as Token)
    if (!key) {
      console.log('Failed to get price token key for balance', balance)
      return balance as PricedBalance
    }

    const price = prices.coins[key]
    if (price === undefined) {
      console.log(`Failed to get price on Defillama API for ${key}`)
      return balance as PricedBalance
    }

    const decimals = balance.decimals || price.decimals
    if (decimals === undefined) {
      console.log(`Failed to get decimals for ${key}`)
      return balance as PricedBalance
    }

    return {
      ...price,
      ...balance,
      timestamp: price.timestamp,
      balanceUSD: mulPrice(balance.amount, decimals, price.price),
      claimableUSD: (balance as RewardBalance).claimable
        ? mulPrice((balance as RewardBalance).claimable || BN_ZERO, decimals, price.price)
        : undefined,
    }
  }

  const pricedBalances: PricedBalance[] = balances.map((balance) => {
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
