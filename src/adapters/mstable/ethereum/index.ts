import {
  getmStableBalances,
  getmStableFarmingBalances,
  getmStableLockerBalance,
  getstkBPTBalance,
  getstkMTABalance,
} from '@adapters/mstable/ethereum/balance'
import { getmStableLPContracts } from '@adapters/mstable/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const pools: Contract[] = [
  { chain: 'ethereum', address: '0x30647a72dc82d7fbb1123ea74716ab8a317eac19' },
  { chain: 'ethereum', address: '0x945facb997494cc2570096c74b5f66a3507330a1' },
  { chain: 'ethereum', address: '0x48c59199da51b7e30ea200a74ea07974e62c4ba7' },
  { chain: 'ethereum', address: '0x17d8cbb6bce8cee970a4027d1198f6700a7a6c24' },
  { chain: 'ethereum', address: '0x4fb30c5a3ac8e85bc32785518633303c4590752d' },
  { chain: 'ethereum', address: '0xfe842e95f8911dcc21c943a1daa4bd641a1381c6' },
  { chain: 'ethereum', address: '0xb61a6f928b3f069a68469ddb670f20eeeb4921e0' },
  { chain: 'ethereum', address: '0x36f944b7312eac89381bd78326df9c84691d8a5b' },
  { chain: 'ethereum', address: '0x4eaa01974b6594c0ee62ffd7fee56cf11e6af936' },
  { chain: 'ethereum', address: '0x2f1423d27f9b20058d9d1843e342726fdf985eb4' },
  { chain: 'ethereum', address: '0xc3280306b6218031e61752d060b091278d45c329' },
]

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x78befca7de27d07dc6e71da295cc2946681a6c7b',
  token: '0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19',
  underlyings: ['0xe2f2a5C287993345a840Db3B0845fbC70f5935a5'],
  rewards: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
  provider: 'mStable',
}

const stkMTA: Contract = {
  chain: 'ethereum',
  address: '0x8f2326316ec696f6d023e37a9931c2b2c177a3d7',
  underlyings: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
  rewards: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
}

const stkBPT: Contract = {
  chain: 'ethereum',
  address: '0xefbe22085d9f29863cfb77eed16d3cc0d927b011',
  vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  pool: '0xe2469f47aB58cf9CF59F9822e3C5De4950a41C49',
  poolId: '0xe2469f47ab58cf9cf59f9822e3c5de4950a41c49000200000000000000000089',
  underlyings: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  rewards: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xae8bc96da4f9a9613c323478be181fdb2aa0e1bf',
  underlyings: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
  rewards: ['0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2'],
  symbol: 'vMTA',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const LPs = await getmStableLPContracts(ctx, pools)

  return {
    contracts: { LPs, farmer, stkMTA, stkBPT, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LPs: getmStableBalances,
    farmer: getmStableFarmingBalances,
    stkMTA: getstkMTABalance,
    stkBPT: getstkBPTBalance,
    locker: getmStableLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}
