import {
  getGFIBalances,
  getGoldFinchDepositBalances,
  getGoldFinchNFTFarmBalances,
  getGoldFinchNFTStakeBalances,
  getGoldFinchStakeBalances,
} from '@adapters/goldfinch/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const FIDU: Contract = {
  chain: 'ethereum',
  address: '0x6a445e9f40e0b97c92d0b8a3366cef1d67f700bf',
  decimals: 18,
  symbol: 'FIDU',
  underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
}

const GFI_Depositer: Contract = {
  chain: 'ethereum',
  address: '0xc84D4a45d1d7EB307BBDeA94b282bEE9892bd523',
  token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
}

const GFI_V2_Staker: Contract = {
  chain: 'ethereum',
  address: '0xfd6ff39da508d281c2d255e9bbbfab34b6be60c3',
  token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  rewards: ['0xdab396ccf3d84cf2d07c4454e10c8a6f5b008d2b'],
}

const GFI_V2_Farmer: Contract = {
  chain: 'ethereum',
  address: '0x57686612C601Cb5213b01AA8e80AfEb24BBd01df',
  token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  rewards: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
}

const GFI: Contract = {
  chain: 'ethereum',
  address: '0x4e5d9b093986d864331d88e0a13a616e1d508838',
  token: '0xdab396ccf3d84cf2d07c4454e10c8a6f5b008d2b',
  rewards: ['0xdab396ccf3d84cf2d07c4454e10c8a6f5b008d2b'],
}

export const getContracts = () => {
  return {
    contracts: { FIDU, GFI_V2_Staker, GFI_V2_Farmer, GFI, GFI_Depositer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    FIDU: getGoldFinchStakeBalances,
    GFI_Depositer: getGoldFinchDepositBalances,
    GFI_V2_Staker: getGoldFinchNFTStakeBalances,
    GFI_V2_Farmer: getGoldFinchNFTFarmBalances,
    GFI: getGFIBalances,
  })

  return {
    groups: [{ balances }],
  }
}
