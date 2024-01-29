import { getLybraFarmBalances } from '@adapters/lybra-v2/ethereum/farm'
import { getLybraLendBalances } from '@adapters/lybra-v2/ethereum/lend'
import { getLybraVestBalance } from '@adapters/lybra-v2/ethereum/vest'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const vaults: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xa980d4c0C2E48d305b582AA439a3575e3de06f0E',
    token: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
  {
    chain: 'ethereum',
    address: '0x5e28B5858DA2C6fb4E449D69EEb5B82e271c45Ce',
    token: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  },
  {
    chain: 'ethereum',
    address: '0xB72dA4A9866B0993b9a7d842E5060716F74BF262',
    token: '0xa2E3356610840701BDf5611a53974510Ae27E2e1',
  },
  {
    chain: 'ethereum',
    address: '0x090B2787D6798000710a8e821EC6111d254bb958',
    token: '0xae78736Cd615f374D3085123A210448E74Fc6393',
  },
]

const vester: Contract = {
  chain: 'ethereum',
  address: '0xc2966a73bbc53f3c99268ed84d245dbe972ed89e',
  token: '0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd',
  underlyings: ['0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd'],
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x73b1988a3336208e55275c52fac7f5d3a7dfb89f',
  token: '0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd',
  underlyings: ['0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd'],
}

const crvFarmer: Contract = {
  chain: 'ethereum',
  address: '0x19d7cb89e1f92f21d71db34bef4944b9f3344d6e',
  pool: '0x2673099769201c08E9A5e63b25FBaF25541A6557',
  token: '0x2673099769201c08E9A5e63b25FBaF25541A6557',
  underlyings: [
    '0xdf3ac4F479375802A821f7b7b46Cd7EB5E4262cC',
    '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  ],
  rewards: ['0x73b1988a3336208e55275C52faC7F5d3A7DFb89f'],
  provider: 'curve',
}

const uniFarmer: Contract = {
  chain: 'ethereum',
  address: '0xec7c6cd15d9bd98fc9805e0509e3bb2033c5956d',
  token: '0x3A0eF60e803aae8e94f741E7F61c7CBe9501e569',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd'],
  rewards: ['0x73b1988a3336208e55275C52faC7F5d3A7DFb89f'],
  provider: 'swap',
}

export const getContracts = () => {
  return {
    contracts: { vaults, vester, farmers: [crvFarmer, uniFarmer], staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getLybraLendBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      vester: getLybraVestBalance,
      staker: getSingleStakeBalance,
      farmers: getLybraFarmBalances,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1693008000,
}
