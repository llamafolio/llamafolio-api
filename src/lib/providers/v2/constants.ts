import { environment } from '@environment'
import {
  arbitrum,
  avalanche,
  bsc,
  canto,
  celo,
  fantom,
  gnosis,
  harmonyOne,
  localhost,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains'

export const chains = {
  mainnet,
  polygon,
  optimism,
  avalanche,
  harmonyOne,
  canto,
  celo,
  gnosis,
  arbitrum,
  bsc,
  fantom,
  localhost,
}

export type Network = keyof typeof chains

const alchemyHTTP = `https://eth-mainnet.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`
const alchemyWS = `wss://eth-mainnet.ws.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`
const infuraHTTP = `https://mainnet.infura.io/v3/${environment.INFURA_API_KEY}`
const infuraWS = `wss://mainnet.infura.io/ws/v3/${environment.INFURA_API_KEY}`
const cloudflareHTTP = `https://cloudflare-eth.com`
const ankrHTTP = `https://rpc.ankr.com/eth/${environment.ANKR_API_KEY}`
const ankrWS = `wss://rpc-ws.ankr.com/eth/${environment.ANKR_API_KEY}`
const llamafolioHTTP = `https://api.llamafolio.com/eth/mainnet`
const localAnvilHTTP = `http://127.0.0.1:8545`

const thirdPartyHttpProviders = [alchemyHTTP, infuraHTTP, cloudflareHTTP, ankrHTTP, llamafolioHTTP]
const thirdPartyWSProviders = [alchemyWS, infuraWS, ankrWS]

export const httpProviders = [localAnvilHTTP, ...thirdPartyHttpProviders]

export const wsProviders = [...thirdPartyWSProviders]
