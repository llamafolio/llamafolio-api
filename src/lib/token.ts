import { insertTokens, selectChainTokens } from '@db/tokens'
import { BaseContract, Contract, ContractStandard, RawContract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { isNotNullish } from '@lib/type'
import { PoolClient } from 'pg'

export const ETH_ADDR = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export interface Token {
  chain: Chain
  address: string
  symbol: string
  decimals: number
  native?: boolean
  coingeckoId?: string
  // optional token used to retrieve price.
  // ex: WETH -> ETH
  priceSubstitute?: string
}

export const ETH: Token = {
  chain: 'ethereum',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  coingeckoId: 'ethereum',
  native: true,
}

export async function resolveContractsTokens(
  client: PoolClient,
  contractsMap: {
    [key: string]: RawContract | RawContract[] | Contract | Contract[] | undefined
  },
  storeMissingTokens = false,
) {
  const chainsAddresses: Partial<Record<Chain, Set<string>>> = {}
  const res: { [key: string]: BaseContract | BaseContract[] | undefined } = {}

  for (const key in contractsMap) {
    const contracts = contractsMap[key]

    if (Array.isArray(contracts)) {
      for (const contract of contracts) {
        if (!chainsAddresses[contract.chain]) {
          chainsAddresses[contract.chain] = new Set<string>()
        }
        chainsAddresses[contract.chain]?.add(contract.address.toLowerCase())
        if (contract.underlyings) {
          for (const underlying of contract.underlyings) {
            if (typeof underlying === 'string') {
              chainsAddresses[contract.chain]?.add(underlying.toLowerCase())
            }
          }
        }
        if (contract.rewards) {
          for (const reward of contract.rewards) {
            if (typeof reward === 'string') {
              chainsAddresses[contract.chain]?.add(reward.toLowerCase())
            }
          }
        }
      }
    } else if (contracts) {
      if (!chainsAddresses[contracts.chain]) {
        chainsAddresses[contracts.chain] = new Set<string>()
      }
      chainsAddresses[contracts.chain]?.add(contracts.address.toLowerCase())
      if (contracts.underlyings) {
        for (const underlying of contracts.underlyings) {
          if (typeof underlying === 'string') {
            chainsAddresses[contracts.chain]?.add(underlying.toLowerCase())
          }
        }
      }
      if (contracts.rewards) {
        for (const reward of contracts.rewards) {
          if (typeof reward === 'string') {
            chainsAddresses[contracts.chain]?.add(reward.toLowerCase())
          }
        }
      }
    }
  }

  const chains = Object.keys(chainsAddresses)

  // get tokens info from DB
  const chainsTokensRes = await Promise.all(
    chains.map((chain) => selectChainTokens(client, chain as Chain, Array.from(chainsAddresses[chain as Chain] || []))),
  )

  const chainsTokens: Partial<Record<Chain, Record<string, Token>>> = {}

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i] as Chain
    for (const token of chainsTokensRes[i]) {
      if (!chainsTokens[chain]) {
        chainsTokens[chain] = {}
      }
      chainsTokens[chain]![token.address.toLowerCase()] = { ...token, chain }
    }
  }

  // collect missing tokens and fetch their info on-chain
  const missingChainsTokens: Partial<Record<Chain, string[]>> = {}

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i] as Chain

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

  const missingChainsTokensRes = await Promise.all(
    missingTokensChains.map((chain) => getERC20Details(chain as Chain, missingChainsTokens[chain as Chain] || [])),
  )

  for (let i = 0; i < missingTokensChains.length; i++) {
    const chain = missingTokensChains[i] as Chain
    for (const token of missingChainsTokensRes[i]) {
      if (!chainsTokens[chain]) {
        chainsTokens[chain] = {}
      }
      chainsTokens[chain]![token.address.toLowerCase()] = { ...token, chain }
    }
  }

  // map back and filter entries if missing tokens
  for (const key in contractsMap) {
    const contracts = contractsMap[key]
    let resContracts: Contract | Contract[] | undefined = undefined

    if (Array.isArray(contracts)) {
      resContracts = []

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
          resContracts.push({
            ...contract,
            ...(chainsTokens[contract.chain]?.[contract.address.toLowerCase()] || {}),
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
        resContracts = {
          ...contracts,
          ...(chainsTokens[contracts.chain]?.[contracts.address.toLowerCase()] || {}),
          underlyings: underlyingTokens,
          rewards: rewardTokens,
        }
      }
    }

    res[key] = resContracts
  }

  if (storeMissingTokens) {
    const now = new Date()

    await Promise.all(
      missingTokensChains
        .map((chain, i) => {
          const tokens = (missingChainsTokensRes[i] || []).map((token) => ({
            address: token.address,
            standard: 'erc20' as ContractStandard,
            name: undefined,
            symbol: token.symbol,
            decimals: token.decimals,
            totalSupply: undefined,
            coingeckoId: token.coingeckoId || undefined,
            cmcId: undefined,
            updated_at: now,
          }))

          if (tokens.length > 0) {
            console.log(`Inserting ${tokens.length} tokens on ${chain}`)
            return insertTokens(client, chain as Chain, tokens)
          }
        })
        .filter(isNotNullish),
    )
  }

  return res
}
