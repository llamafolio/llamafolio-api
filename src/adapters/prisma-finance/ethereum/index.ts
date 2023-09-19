import { getPoolsContracts } from '@adapters/curve-dex/ethereum/pools'
import {
  getPrismaFarmBalance,
  getPrismaFarmBalancesFromConvex,
  getPrismaLendBalances,
} from '@adapters/prisma-finance/ethereum/balance'
import { getConvexPools } from '@adapters/prisma-finance/ethereum/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xed8b26d99834540c5013701bb3715fafd39993ba',
  token: '0x4591DBfF62656E7859Afe5e45f6f47D3669fBB28',
}

const farmersFromConvex: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x0ae09f649e9da1b6aea0c10527ac4e8a88a37480',
    pid: 225,
    rewards: [
      '0xdA47862a83dac0c112BA89c6abC2159b95afd71C',
      '0xD533a949740bb3306d119CC777fa900bA034cd52',
      '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
    ],
  },
  {
    chain: 'ethereum',
    address: '0xf6aa46869220ae703924d5331d88a21dcef3b19d',
    pid: 226,
    rewards: [
      '0xdA47862a83dac0c112BA89c6abC2159b95afd71C',
      '0xD533a949740bb3306d119CC777fa900bA034cd52',
      '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
    ],
  },
  {
    chain: 'ethereum',
    address: '0x5f8d4319c27a940b5783b4495cca6626e880532e',
    pid: 227,
    rewards: [
      '0xdA47862a83dac0c112BA89c6abC2159b95afd71C',
      '0xD533a949740bb3306d119CC777fa900bA034cd52',
      '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
    ],
  },
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

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export const getContracts = async (ctx: BaseContext) => {
  const curvePools = await getPoolsContracts(ctx, metaRegistry)
  const convexPools = await getConvexPools(ctx, farmersFromConvex, curvePools)

  return {
    contracts: { vaults, farmer, convexPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getPrismaLendBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      farmer: getPrismaFarmBalance,
      convexPools: (...args) => getPrismaFarmBalancesFromConvex(...args, metaRegistry),
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
