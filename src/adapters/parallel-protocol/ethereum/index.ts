import { getParallelLendBalances } from '@adapters/parallel-protocol/ethereum/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

const assets: `0x${string}`[] = [
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919', // RAI
  '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0', // LUDS
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV
  '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', // SUSHI
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wsTETH
  '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', // cbETH
  '0xae78736cd615f374d3085123a210448e74fc6393', // rETH
  '0xac3e018457b222d93114458476f3e3416abbe38f', // sfrxETH
]

const MIMO: Token = {
  chain: 'ethereum',
  address: '0x90B831fa3Bebf58E9744A14D638E25B4eE06f9Bc',
  decimals: 18,
  symbol: 'MIMO',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0x9c29d8d359255e524702c7a9c95c6e6ae38274dc',
  underlyings: assets,
}

const config: Contract = {
  chain: 'ethereum',
  address: '0xAA4CB7dbB37dBA644e0C180291574ef4e6aBB187',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x24324efe11b1f64ef4ada399f03d6a42264bb8ac',
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { vault, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getParallelLendBalances(ctx, contracts.vault!, config),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      locker: (...args) => getSingleLockerBalance(...args, MIMO, 'locked'),
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
