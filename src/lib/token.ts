import { Chain } from '@lib/chains'

import { Contract, ContractsConfig } from './adapter'
import { getERC20Details } from './erc20'
import { isNotNullish } from './type'

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

export async function resolveContractsTokens(contractsMap: ContractsConfig['contracts']) {
  const chainsAddresses: Partial<Record<Chain, Set<string>>> = {}
  const res: ContractsConfig['contracts'] = {}

  for (const key in contractsMap) {
    const contracts = contractsMap[key]

    if (Array.isArray(contracts)) {
      for (const contract of contracts) {
        if (!chainsAddresses[contract.chain]) {
          chainsAddresses[contract.chain] = new Set<string>()
        }
        chainsAddresses[contract.chain]?.add(contract.address.toLowerCase())
        if (contract.underlyings) {
          chainsAddresses[contract.chain]?.add(...contract.underlyings.map((address) => address.toLowerCase()))
        }
        if (contract.rewards) {
          chainsAddresses[contract.chain]?.add(...contract.rewards.map((address) => address.toLowerCase()))
        }
      }
    } else if (contracts) {
      if (!chainsAddresses[contracts.chain]) {
        chainsAddresses[contracts.chain] = new Set<string>()
      }
      chainsAddresses[contracts.chain]?.add(contracts.address.toLowerCase())
      if (contracts.underlyings) {
        chainsAddresses[contracts.chain]?.add(...contracts.underlyings.map((address) => address.toLowerCase()))
      }
      if (contracts.rewards) {
        chainsAddresses[contracts.chain]?.add(...contracts.rewards.map((address) => address.toLowerCase()))
      }
    }
  }

  const chains = Object.keys(chainsAddresses)

  const chainsTokensRes = await Promise.all(
    chains.map((chain) => getERC20Details(chain, Array.from(chainsAddresses[chain]))),
  )

  const chainsTokens: Partial<Record<Chain, Record<string, Token>>> = {}

  for (const chainTokensRes of chainsTokensRes) {
    for (const token of chainTokensRes) {
      if (!chainsTokens[token.chain]) {
        chainsTokens[token.chain] = {}
      }
      chainsTokens[token.chain][token.address.toLowerCase()] = token
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
          ?.map((address) => chainsTokens[contract.chain]?.[address.toLowerCase()])
          .filter(isNotNullish)

        const rewardTokens = contract.rewards
          ?.map((address) => chainsTokens[contract.chain]?.[address.toLowerCase()])
          .filter(isNotNullish)

        if (
          underlyingTokens?.length === contract.underlyings?.length &&
          rewardTokens?.length === contract.rewards?.length
        ) {
          // if 1 underlying specified, default contract to it
          const underlying = underlyingTokens?.length === 1 ? underlyingTokens[0] : {}

          resContracts.push({
            ...contract,
            // ...underlying,
            ...(chainsTokens[contract.chain]?.[contract.address.toLowerCase()] || {}),
            underlyings: underlyingTokens,
            rewards: rewardTokens,
          })
        }
      }
    } else if (contracts) {
      const underlyingTokens = contracts.underlyings
        ?.map((address) => chainsTokens[contracts.chain]?.[address.toLowerCase()])
        .filter(isNotNullish)

      const rewardTokens = contracts.rewards
        ?.map((address) => chainsTokens[contracts.chain]?.[address.toLowerCase()])
        .filter(isNotNullish)

      if (
        underlyingTokens?.length === contracts.underlyings?.length &&
        rewardTokens?.length === contracts.rewards?.length
      ) {
        // if 1 underlying specified, default contract to it
        const underlying = underlyingTokens?.length === 1 ? underlyingTokens[0] : {}

        resContracts = {
          ...contracts,
          ...underlying,
          ...(chainsTokens[contracts.chain]?.[contracts.address.toLowerCase()] || {}),
          underlyings: underlyingTokens,
          rewards: rewardTokens,
        }
      }
    }

    res[key] = resContracts
  }

  return res
}
