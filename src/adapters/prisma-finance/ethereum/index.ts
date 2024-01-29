import {
  getPrismaFarmBalance,
  getPrismaFarmBalancesFromConvex,
  getPrismaFarmBalancesFromCurve,
  getPrismaLendBalances,
} from '@adapters/prisma-finance/ethereum/balance'
import { getPrismaCRVContracts, getPrismaCVXContracts } from '@adapters/prisma-finance/ethereum/contract'
import { getPrismaLockerBalance } from '@adapters/prisma-finance/ethereum/locker'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xed8b26d99834540c5013701bb3715fafd39993ba',
  token: '0x4591DBfF62656E7859Afe5e45f6f47D3669fBB28',
  rewards: ['0xda47862a83dac0c112ba89c6abc2159b95afd71c'],
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x3f78544364c3eccdce4d9c89a630aea26122829d',
  token: '0xda47862a83dac0c112ba89c6abc2159b95afd71c',
}

const farmersFromConvexAddresses: `0x${string}`[] = [
  '0x0ae09f649e9da1b6aea0c10527ac4e8a88a37480',
  '0xf6aa46869220ae703924d5331d88a21dcef3b19d',
  '0x3d56e0ea536a78976503618d663921c97a3cba3c',
  '0x685e852e4c18c2c554a1d25c1197684fd9593145',
  '0xa68c880009b8e78cc42b215702573a7552ef2c68',
  '0xd91fba4919b7bf3b757320ea48ba102f543de341',
  '0x48c5e00c63e327f73f789e300472f1744aaa7e34',
  '0xb8fa880840a64c25318989b907ccb58fd7a324df',
]

const farmersFromCurveAddresses: `0x${string}`[] = [
  '0x5f8d4319c27a940b5783b4495cca6626e880532e',
  '0x6d3cd0dd2c05fa4eb8d1159159bef445593a93fc',
  '0x71ad6c1d92546065b13bf701a7524c69b409e25c',
  '0xb5376ab455194328fe41450a587f11bcda2363fa',
  '0x49cd193227a896f867afdb6a5edfb53a3ee7fb49',
  '0xa9aa35b5481a7b7936d1680911d478f7a639fe48',
  '0xbced0f33bedd1d325f069d5481c7076a5d0709a4',
]

const vaults: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    troves: '0xBf6883a03FD2FCfa1B9fc588ad6193b3C3178F8F',
  },
  {
    chain: 'ethereum',
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    troves: '0xe0e255FD5281bEc3bB8fa1569a20097D9064E445',
  },
  {
    chain: 'ethereum',
    address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    troves: '0x63Cc74334F4b1119276667cf0079AC0c8a96CFb2',
  },
  {
    chain: 'ethereum',
    address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
    troves: '0xf69282a7e7ba5428f92F610E7AFa1C0ceDC4E483',
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const [farmersFromConvex, farmersFromCurve] = await Promise.all([
    getPrismaCVXContracts(ctx, farmersFromConvexAddresses),
    getPrismaCRVContracts(ctx, farmersFromCurveAddresses),
  ])

  return {
    contracts: { vaults, farmer, farmersFromConvex, farmersFromCurve, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getPrismaLendBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      farmer: getPrismaFarmBalance,
      locker: getPrismaLockerBalance,
      farmersFromCurve: getPrismaFarmBalancesFromCurve,
      farmersFromConvex: getPrismaFarmBalancesFromConvex,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1693440000,
}
