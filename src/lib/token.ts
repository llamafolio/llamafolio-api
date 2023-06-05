import type { ERC20Token } from '@db/tokens'
import { insertERC20Tokens, selectChainTokens } from '@db/tokens'
import type { BaseContract, Contract, RawContract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { isNotNullish } from '@lib/type'
import type { PoolClient } from 'pg'

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

const resolveTokenAddress = (contract: Contract) => contract.token?.toLowerCase() ?? contract.address.toLowerCase()

/**
 * 1. Collect token addresses from the `contractsMap` object for each chain and store them in the `chainsAddresses` object.
 * 2. Fetch token information from the database for all collected token addresses and store them in the `chainsTokens` object.
 * 3. Identify missing tokens (tokens not found in the database) and store their addresses in the `missingChainsTokens` object.
 * 4. Fetch missing token information from the on-chain data using the `getERC20Details` function,
 *    and update the `chainsTokens` object with the missing token information.
 * 5. Map the resolved token information back to the original `contractsMap` and filter out any entries with missing tokens.
 *    Store the result in the `response` object.
 * 6. If the `storeMissingTokens` flag is `true`, insert the missing tokens into the database and log the number of inserted tokens.
 * 7. Return the `response` object containing the resolved token information for the contracts.
 *
 * In summary, this function resolves token information for a set of contracts by fetching data from the database and on-chain sources,
 * and then maps the resolved token data back to the original contracts. It also provides an option to store missing tokens in the database.
 */

async function processContract(chain: Chain, contract: RawContract | Contract) {
  const tokenAddresses = new Set<string>()
  tokenAddresses.add(resolveTokenAddress(contract))

  for (const underlying of contract.underlyings || []) {
    if (typeof underlying === 'string') tokenAddresses.add(underlying.toLowerCase())
  }

  for (const reward of contract.rewards || []) {
    if (typeof reward === 'string') tokenAddresses.add(reward.toLowerCase())
  }

  return { chain, tokenAddresses }
}

async function processContracts(contracts: Array<RawContract | Contract>) {
  const chainsAddresses: Partial<Record<Chain, Set<string>>> = {}

  for (const contract of contracts) {
    const { chain, tokenAddresses } = await processContract(contract.chain, contract)
    if (!chainsAddresses[chain]) {
      chainsAddresses[chain] = new Set<string>()
    }
    for (const address of tokenAddresses) {
      chainsAddresses[chain]?.add(address)
    }
  }
  return chainsAddresses
}

export async function resolveContractsTokens(
  client: PoolClient,
  contractsMap: {
    [key: string]: RawContract | RawContract[] | Contract | Contract[] | undefined
  },
  storeMissingTokens = false,
) {
  const contractsArray: (RawContract | Contract)[] = []

  for (const contracts of Object.values(contractsMap)) {
    if (Array.isArray(contracts)) {
      contractsArray.push(...contracts)
    } else if (contracts) {
      contractsArray.push(contracts)
    }
  }

  const chainsAddresses = await processContracts(contractsArray)

  const chains = Object.keys(chainsAddresses)

  // get tokens info from DB
  const chainsTokensResponse = await Promise.all(
    chains.map((chain) => selectChainTokens(client, chain as Chain, [...(chainsAddresses[chain as Chain] || [])])),
  )

  const chainsTokens: Partial<Record<Chain, Record<`0x${string}`, Token>>> = {}

  for (let index = 0; index < chains.length; index++) {
    const chain = chains[index] as Chain
    for (const token of chainsTokensResponse[index]) {
      if (!chainsTokens[chain]) {
        chainsTokens[chain] = {}
      }
      chainsTokens[chain]![token.address.toLowerCase()] = { ...token, chain }
    }
  }

  // collect missing tokens and fetch their info on-chain
  const missingChainsTokens: Partial<Record<Chain, string[]>> = {}

  for (let index = 0; index < chains.length; index++) {
    const chain = chains[index] as Chain
    const chainAddresses = chainsAddresses[chain as Chain]
    if (chainAddresses) {
      for (const address of chainAddresses) {
        if (!chainsTokens[chain]?.[address]) {
          if (!missingChainsTokens[chain]) {
            missingChainsTokens[chain] = []
          }
          missingChainsTokens[chain]!.push(address)
        }
      }
    }
  }

  const missingTokensChains = Object.keys(missingChainsTokens)

  const missingChainsTokensResponse = await Promise.all(
    missingTokensChains.map((chain) =>
      getERC20Details({ chain: chain as Chain, adapterId: '' }, missingChainsTokens[chain as Chain] || []),
    ),
  )

  for (let index = 0; index < missingTokensChains.length; index++) {
    const chain = missingTokensChains[index] as Chain
    for (const token of missingChainsTokensResponse[index]) {
      if (!chainsTokens[chain]) {
        chainsTokens[chain] = {}
      }
      chainsTokens[chain]![token.address.toLowerCase()] = { ...token, chain }
    }
  }

  // map back and filter entries if missing tokens
  const response: { [key: string]: BaseContract | BaseContract[] | undefined } = {}

  for (const key in contractsMap) {
    const contracts = contractsMap[key]
    let responseContracts: Contract | Contract[] | undefined

    if (Array.isArray(contracts)) {
      responseContracts = []

      for (const contract of contracts) {
        const underlyingTokens = contract.underlyings
          ?.map((underlying) =>
            typeof underlying === 'string' ? chainsTokens[contract.chain]?.[underlying.toLowerCase()] : underlying,
          )
          .filter(isNotNullish)

        const rewardTokens = contract.rewards
          ?.map((reward) =>
            typeof reward === 'string' ? chainsTokens[contract.chain]?.[reward.toLowerCase()] : reward,
          )
          .filter(isNotNullish)

        if (
          underlyingTokens?.length === contract.underlyings?.length &&
          rewardTokens?.length === contract.rewards?.length
        ) {
          responseContracts.push({
            ...chainsTokens[contract.chain]?.[resolveTokenAddress(contract)],
            ...contract,
            underlyings: underlyingTokens,
            rewards: rewardTokens,
          })
        }
      }
    } else if (contracts) {
      const underlyingTokens = contracts.underlyings
        ?.map((underlying) =>
          typeof underlying === 'string' ? chainsTokens[contracts.chain]?.[underlying.toLowerCase()] : underlying,
        )
        .filter(isNotNullish)

      const rewardTokens = contracts.rewards
        ?.map((reward) => (typeof reward === 'string' ? chainsTokens[contracts.chain]?.[reward.toLowerCase()] : reward))
        .filter(isNotNullish)

      if (
        underlyingTokens?.length === contracts.underlyings?.length &&
        rewardTokens?.length === contracts.rewards?.length
      ) {
        responseContracts = {
          ...chainsTokens[contracts.chain]?.[resolveTokenAddress(contracts)],
          ...contracts,
          underlyings: underlyingTokens,
          rewards: rewardTokens,
        }
      }
    }

    response[key] = responseContracts
  }

  if (storeMissingTokens) {
    const missingTokens: ERC20Token[] = []

    for (let chainIndex = 0; chainIndex < missingTokensChains.length; chainIndex++) {
      for (const token of missingChainsTokensResponse[chainIndex]) {
        missingTokens.push({
          address: token.address,
          chain: missingTokensChains[chainIndex] as Chain,
          name: (token as unknown as any).name,
          symbol: token.symbol,
          decimals: token.decimals,
          coingeckoId: token.coingeckoId || undefined,
          cmcId: undefined,
        })
      }
    }

    if (missingTokens.length > 0) {
      await insertERC20Tokens(client, missingTokens)

      console.log(`Inserted ${missingTokens.length} tokens`)
    }
  }

  return response
}
