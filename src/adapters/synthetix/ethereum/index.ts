import { getSNXBalances } from '@adapters/synthetix/common/balance'
import { getSNXFarmBalances } from '@adapters/synthetix/common/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const SNX: Contract = {
  chain: 'ethereum',
  address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  token: '0xd0dA9cBeA9C3852C5d63A95F9ABCC4f6eA0F9032',
  underlyings: ['0x57Ab1ec28D129707052df4dF418D58a2D46d5f51'],
  rewarder: '0x83105D7CDd2fd9b8185BFF1cb56bB1595a618618',
}

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x13c1542a468319688b89e323fe9a3be3a90ebb27',
    token: '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3',
    underlyings: [
      '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6',
    ],
    provider: 'curve',
  },
  {
    chain: 'ethereum',
    address: '0xf0de877f2f9e7a60767f9ba662f10751566ad01c',
    token: '0x055dB9AFF4311788264798356bbF3a733AE181c6',
    underlyings: ['0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', '0x918dA91Ccbc32B7a6A0cc4eCd5987bbab6E31e6D'],
    provider: 'balancer',
  },
  {
    chain: 'ethereum',
    address: '0xfbaedde70732540ce2b11a8ac58eb2dc0d69de10',
    token: '0x815F8eF4863451f4Faf34FBc860034812E7377d9',
    underlyings: ['0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    provider: 'balancer',
  },
  {
    chain: 'ethereum',
    address: '0x167009dcda2e49930a71712d956f02cc980dcc1b',
    token: '0xD6014EA05BDe904448B743833dDF07c3C7837481',
    underlyings: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
    provider: 'snx',
  },
  {
    chain: 'ethereum',
    address: '0x8302fe9f0c509a996573d3cc5b0d5d51e4fdd5ec',
    token: '0x34a0216C5057bC18e5d34D4405284564eFd759b2',
    underlyings: ['0x261EfCdD24CeA98652B9700800a13DfBca4103fF', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    provider: 'uniswap',
  },
  {
    chain: 'ethereum',
    address: '0x3f27c540adae3a9e8c875c61e3b970b559d7f65d',
    token: '0xA9859874e1743A32409f75bB11549892138BBA1E',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    provider: 'snx',
  },
  {
    chain: 'ethereum',
    address: '0xc0d8994cd78ee1980885df1a0c5470fc977b5cfe',
    token: '0x194eBd173F6cDacE046C53eACcE9B953F28411d1',
    underlyings: ['0xdb25f211ab05b1c97d595516f45794528a807ad8', '0xd71ecff9342a5ced620049e616c5035f1db98620'],
    provider: 'curve',
  },
  {
    chain: 'ethereum',
    address: '0xdc338c7544654c7dadfeb7e44076e457963113b0',
    token: '0x74821343b5b969c0D4b31aFF3931E00a40990CfD',
    underlyings: ['0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', '0x9CF7E61853ea30A41b02169391b393B901eac457'],
    provider: 'balancer',
  },
]

export const getContracts = async () => {
  return {
    contracts: { SNX, farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    SNX: getSNXBalances,
    farmers: getSNXFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
