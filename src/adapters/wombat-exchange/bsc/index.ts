import { getWombatPoolsContracts } from '@adapters/wombat-exchange/common/contract'
import { getWombatFarmBalances } from '@adapters/wombat-exchange/common/farm'
import { getWombatLockBalance } from '@adapters/wombat-exchange/common/lock'
import { getWombatLpBalances } from '@adapters/wombat-exchange/common/lp'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const WOM: Token = {
  chain: 'bsc',
  address: '0xad6742a35fb341a9cc6ad674738dd8da98b94fb1',
  decimals: 18,
  symbol: 'WOM',
}

const mainPools: Contract = {
  chain: 'bsc',
  address: '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0',
}
const hayPools: Contract = {
  chain: 'bsc',
  address: '0x0520451B19AD0bb00eD35ef391086A692CFC74B2',
}
const fraxPools: Contract = {
  chain: 'bsc',
  address: '0x48f6A8a0158031BaF8ce3e45344518f1e69f2A14',
}
const wmxWomPools: Contract = {
  chain: 'bsc',
  address: '0xeEB5a751E0F5231Fc21c7415c4A4c6764f67ce2e',
}
const mWomPools: Contract = {
  chain: 'bsc',
  address: '0x083640c5dBD5a8dDc30100FB09B45901e12f9f55',
}
const qWomPools: Contract = {
  chain: 'bsc',
  address: '0x2c5464b9052319e3d76f8279031f04e4B7fd7955',
}
const bnbxPools: Contract = {
  chain: 'bsc',
  address: '0x8df1126de13bcfef999556899F469d64021adBae',
}
const stkBNBPools: Contract = {
  chain: 'bsc',
  address: '0xB0219A90EF6A24a237bC038f7B7a6eAc5e01edB0',
}
const frxETHPools: Contract = {
  chain: 'bsc',
  address: '0x2Ea772346486972E7690219c190dAdDa40Ac5dA4',
}
const iUSDPools: Contract = {
  chain: 'bsc',
  address: '0x277E777F7687239B092c8845D4d2cd083a33C903',
}
const axlUSDCPools: Contract = {
  chain: 'bsc',
  address: '0x8ad47d7ab304272322513eE63665906b64a49dA2',
}
const sSDDPools: Contract = {
  chain: 'bsc',
  address: '0x05f727876d7C123B9Bb41507251E2Afd81EAD09A',
}
const bOBPools: Contract = {
  chain: 'bsc',
  address: '0xeA6cDd9e8819BbF7f8791E7D084d9F0a6Afa7892',
}
const stableGuildPools: Contract = {
  chain: 'bsc',
  address: '0x9498563e47D7CFdFa22B818bb8112781036c201C',
}
const MIMPools: Contract = {
  chain: 'bsc',
  address: '0xb8b1b72a9b9BA90E2539348fEC1Ad6b265F9F684',
}
const ankrBNBPools: Contract = {
  chain: 'bsc',
  address: '0x6F1c689235580341562cdc3304E923cC8fad5bFa',
}
const BNByPools: Contract = {
  chain: 'bsc',
  address: '0xbed9B758A681d73a95Ab4c01309C63aa16297b80',
}
const SmartHAYPools: Contract = {
  chain: 'bsc',
  address: '0xa61dccC6c6E34C8Fbf14527386cA35589e9b8C27',
}
const wBETHPools: Contract = {
  chain: 'bsc',
  address: '0x8b892b6Ea1d0e5B29b719d6Bd6eb9354f1cDE060',
}
const ankrETHPools: Contract = {
  chain: 'bsc',
  address: '0x1b507b97c89eDE3E40d1b2Ed92972197c6276D35',
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0x489833311676b566f888119c29bd997dc6c95830',
  rewards: [WOM],
}

const locker: Contract = {
  chain: 'bsc',
  address: '0x3da62816dd31c56d9cdf22c6771ddb892cb5b0cc',
  underlyings: [WOM],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getWombatPoolsContracts(ctx, [
    mainPools,
    hayPools,
    fraxPools,
    wmxWomPools,
    mWomPools,
    qWomPools,
    bnbxPools,
    stkBNBPools,
    frxETHPools,
    iUSDPools,
    axlUSDCPools,
    sSDDPools,
    bOBPools,
    stableGuildPools,
    MIMPools,
    ankrBNBPools,
    BNByPools,
    SmartHAYPools,
    wBETHPools,
    ankrETHPools,
  ])

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
  }
}

const getWombatBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getWombatLpBalances(ctx, pools), getWombatFarmBalances(ctx, pools, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getWombatBalances,
    locker: getWombatLockBalance,
  })

  return {
    groups: [{ balances }],
  }
}
