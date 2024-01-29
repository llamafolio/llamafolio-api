import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLONFarmBalances } from './farm'
import { getxLONstakerBalances } from './stake'

const xLON: Contract = {
  chain: 'ethereum',
  address: '0xf88506b0f1d30056b9e5580668d5875b9cd30f23',
  underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952'],
  decimals: 18,
  symbol: 'xLON',
}

const pools: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x9648b119f442a3a096c0d5a1f8a0215b46dbb547',
    token: '0x55D31F68975E446a40a2d02FfA4B0E1bFb233c2F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
  },
  {
    chain: 'ethereum',
    address: '0xb6bc1a713e4b11fa31480d31c825dcfd7e8fabfd',
    token: '0x7924a818013f39cf800F5589fF1f1f0DEF54F31F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x74379cec6a2c9fde0537e9d9346222a724a278e4',
    token: '0x7924a818013f39cf800F5589fF1f1f0DEF54F31F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x539a67b6f9c3cad58f434cc12624b2d520bc03f8',
    token: '0x55D31F68975E446a40a2d02FfA4B0E1bFb233c2F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
  },
  {
    chain: 'ethereum',
    address: '0xc348314f74b043ff79396e14116b6f19122d69f4',
    token: '0x7924a818013f39cf800F5589fF1f1f0DEF54F31F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x929cf614c917944dd278bc2134714eaa4121bc6a',
    token: '0x7924a818013f39cf800F5589fF1f1f0DEF54F31F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x11520d501e10e2e02a2715c4a9d3f8aeb1b72a7a',
    token: '0x55D31F68975E446a40a2d02FfA4B0E1bFb233c2F',
    underlyings: ['0x0000000000095413afC295d19EDeb1Ad7B71c952', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
  },
]

export const getContracts = () => {
  return {
    contracts: { xLON, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xLON: getxLONstakerBalances,
    pools: getLONFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1645574400,
                  }
                  