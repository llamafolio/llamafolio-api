import { client } from '@db/clickhouse'
import { selectContracts } from '@db/contracts'
import type { BaseContext, BaseContract, Contract, RawContract } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { type Chain, chainById } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20Details } from '@lib/erc20'
import { isNotNullish } from '@lib/type'
import { getToken } from '@llamafolio/tokens'

export const ETH_ADDR = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export interface Token {
  chain: Chain
  address: `0x${string}`
  name?: string
  symbol: string
  decimals: number
  native?: boolean
  coingeckoId?: string
}

export const ETH: Token = {
  chain: 'ethereum',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  coingeckoId: 'ethereum',
  native: true,
}

export const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  symbol: 'WETH',
  decimals: 18,
  coingeckoId: 'weth',
}

const resolveTokenAddress = (contract: Contract) =>
  (contract.token?.toLowerCase() ?? contract.address.toLowerCase()) as `0x${string}`

export function retrieveToken(chain: Chain, address: string) {
  if (address === ETH_ADDR || address === ADDRESS_ZERO) {
    return chainById[chain].nativeCurrency
  }

  return getToken(chain, address)
}

/**
 * Resolve tokens (contract, underlyings and rewards) from their addresses
 * @param ctx
 * @param contractsMap
 */
export async function resolveContractsTokens(
  ctx: BaseContext,
  contractsMap: {
    [key: string]: RawContract | RawContract[] | Contract | Contract[] | undefined
  },
) {
  // all token addresses to fetch info for
  const tokenAddresses = new Set<`0x${string}`>()

  function registerTokenAddresses(contract: RawContract | Contract) {
    tokenAddresses.add(resolveTokenAddress(contract))

    for (const underlying of contract.underlyings || []) {
      if (typeof underlying === 'string') {
        tokenAddresses.add(underlying.toLowerCase() as `0x${string}`)
      }
    }

    for (const reward of contract.rewards || []) {
      if (typeof reward === 'string') {
        tokenAddresses.add(reward.toLowerCase() as `0x${string}`)
      }
    }
  }

  for (const key in contractsMap) {
    const contracts = contractsMap[key]

    if (Array.isArray(contracts)) {
      for (const contract of contracts) {
        registerTokenAddresses(contract)
      }
    } else if (contracts) {
      registerTokenAddresses(contracts)
    }
  }

  // cross-reference contracts defined by other adapters to build up a tree of underlyings
  const tokens = await selectContracts(client, chainById[ctx.chain].chainId, [...tokenAddresses])
  const tokenByAddress = keyBy(tokens, 'address', { lowercase: true })

  // fetch missing ERC20 on-chain (won't get extra data but will be able to move forward)
  // NOTE: could be fetched using our tokens indexer
  const missingTokenAddresses = new Set<`0x${string}`>()
  for (const token of tokenAddresses) {
    if (tokenByAddress[token] == null) {
      missingTokenAddresses.add(token)
    }
  }

  const missingTokens = await getERC20Details(ctx, [...missingTokenAddresses])
  for (const missingToken of missingTokens) {
    tokenByAddress[missingToken.address.toLowerCase()] = missingToken as Contract
  }

  // map back and filter entries if missing tokens
  // NOTE: there shouldn't be missing underlyings or rewards, that means we failed somewhere
  const response: { [key: string]: BaseContract | BaseContract[] | undefined } = {}

  for (const key in contractsMap) {
    const contracts = contractsMap[key]
    let responseContracts: Contract | Contract[] | undefined

    if (Array.isArray(contracts)) {
      responseContracts = []

      for (const contract of contracts) {
        const underlyingTokens = contract.underlyings
          ?.map((underlying) =>
            typeof underlying === 'string' ? tokenByAddress[underlying.toLowerCase()] : underlying,
          )
          .filter(isNotNullish)

        const rewardTokens = contract.rewards
          ?.map((reward) => (typeof reward === 'string' ? tokenByAddress[reward.toLowerCase()] : reward))
          .filter(isNotNullish)

        if (
          underlyingTokens?.length === contract.underlyings?.length &&
          rewardTokens?.length === contract.rewards?.length
        ) {
          const token = tokenByAddress[resolveTokenAddress(contract)]
          responseContracts.push({
            name: token?.name,
            decimals: token?.decimals,
            symbol: token?.symbol,
            ...contract,
            underlyings: underlyingTokens,
            rewards: rewardTokens,
          })
        } else {
          console.error('Failed to resolve tokens', contracts)
        }
      }
    } else if (contracts) {
      const underlyingTokens = contracts.underlyings
        ?.map((underlying) => (typeof underlying === 'string' ? tokenByAddress[underlying.toLowerCase()] : underlying))
        .filter(isNotNullish)

      const rewardTokens = contracts.rewards
        ?.map((reward) => (typeof reward === 'string' ? tokenByAddress[reward.toLowerCase()] : reward))
        .filter(isNotNullish)

      if (
        underlyingTokens?.length === contracts.underlyings?.length &&
        rewardTokens?.length === contracts.rewards?.length
      ) {
        const token = tokenByAddress[resolveTokenAddress(contracts)]
        responseContracts = {
          name: token?.name,
          decimals: token?.decimals,
          symbol: token?.symbol,
          ...contracts,
          underlyings: underlyingTokens,
          rewards: rewardTokens,
        }
      } else {
        console.error('Failed to resolve tokens', contracts)
      }
    }

    response[key] = responseContracts
  }

  return response
}
