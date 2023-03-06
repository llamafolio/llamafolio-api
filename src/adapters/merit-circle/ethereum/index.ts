import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getLockerBalances } from './locker'

const MC: Token = {
  chain: 'ethereum',
  address: '0x949d48eca67b17269629c7194f4b727d4ef9e5d6',
  decimals: 18,
  symbol: 'MC',
}

const escrowPool: Contract = {
  chain: 'ethereum',
  address: '0xfEEA44bc2161F2Fe11D55E557ae4Ec855e2D1168',
  decimals: 18,
  underlyings: [MC],
  symbol: 'EMC',
}

const mcPool: Contract = {
  chain: 'ethereum',
  address: '0x5c76aD4764A4607cD57644faA937A8cA16729e39',
  decimals: 18,
  underlyings: [MC],
  symbol: 'SMC',
}

const mcPoolv2: Contract = {
  chain: 'ethereum',
  address: '0x74aDae862AdCCCF7a7DBF2f7B139AB56e6b0E79D',
  decimals: 18,
  underlyings: [MC],
  symbol: 'sMCV2',
}

const mcLPPool: Contract = {
  chain: 'ethereum',
  address: '0x44c01e5e4216f3162538914d9c7f5E6A0d87820e',
  decimals: 18,
  underlyings: ['0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  symbol: 'SMCUNILP',
}

const mcLPPoolV2: Contract = {
  chain: 'ethereum',
  address: '0xebE3CA21e37723E0bE0F519724798fe8EEfF83D1',
  decimals: 18,
  lpToken: '0xcCb63225a7B19dcF66717e4d40C9A72B39331d61',
  underlyings: ['0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  symbol: 'sMCUNILPV2',
}

export const getContracts = () => {
  return {
    contracts: { locker: [escrowPool, mcPool, mcPoolv2, mcLPPool, mcLPPoolV2] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getLockerBalances,
  })

  return {
    balances,
  }
}
