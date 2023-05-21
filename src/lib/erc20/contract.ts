import { getAddress } from 'viem'

import * as abi from './abi'
/**
 * Get tokens balances for an address on the following networks:
 */
export const supportedNetworks = [
  'arbitrum',
  'avalanche',
  'bsc',
  'ethereum',
  'fantom',
  'optimism',
  'polygon',
  'celo',
  'gnosis',
  'moonbeam',
] as const

export type SupportedNetwork = (typeof supportedNetworks)[number]

const multiCoinBalanceContracts = {
  arbitrum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  avalanche: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  bsc: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  ethereum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  fantom: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  optimism: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  polygon: '0xE052Ef907f09c0053B237647aD7387D4BDF11A5A',
  gnosis: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  celo: '0xc9ba77c9b27481b6789840a7c3128d4f691f8296',
  moonbeam: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  // 'harmony':'',
} satisfies { [key in SupportedNetwork]: string }

export const chainIsSupported = (network: string): network is SupportedNetwork =>
  supportedNetworks.includes(network as SupportedNetwork)

export function contractDetails(chain: SupportedNetwork) {
  if (!chainIsSupported(chain)) throw new Error(`Unsupported network: ${chain} for MultiCoinBalanceLookup.`)
  return {
    address: getAddress(multiCoinBalanceContracts[chain]),
    abi: abi.getBalancesABI,
  }
}

// export function contractDetails<T extends Network>(
//   parameters: T extends SupportedNetwork ? { chain: T; tokenAddress?: string } : { chain: T; tokenAddress: string },
// ) {
//   if (chainIsSupported(parameters.chain))
//     return {
//       address: getAddress(multiCoinBalanceContracts[parameters.chain]),
//       abi: abi.getBalancesABI,
//     }

//   if (!parameters.tokenAddress) {
//     throw new Error(`Unsupported network: ${parameters.chain}. Token address is required.`)
//   }

//   return {
//     address: getAddress(parameters.tokenAddress),
//     abi: abi.getBalancesABI,
//   }
// }
