import { getLiquidDriverShadowBalances } from '@adapters/liquid-driver/common/balance'
import {
  getLQDRPoolsInfos,
  getResolvedLiquidUnderlyings,
  getUserPendingLQDR,
} from '@adapters/liquid-driver/common/masterchef'
import { getShadowChefContracts } from '@adapters/liquid-driver/common/shadowFarm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const shadowChefAddresses: `0x${string}`[] = [
  '0x59ab3c33e75C91B2B632d51144e57293EF64E556', // LQDR/FTM"
  '0xDC5bDd3966884a2b1cfFd4213DaE925778786f97', // SPIRIT/FTM
  '0xFfa8B88160Bd847a3bF032B78c8967DCa877981C', // USDC/FTM
  '0x767e4Dc3EA4FF70D97BDEEF086e4B021923E4BdD', // LINSPIRIT/SPIRIT
  '0xA7cB4E3Ea2d6B44F4109970d7E9E7B7aBa372Eb5', // WBTC/FTM"
  '0x9CD5ab5b2c00560E93Bb89174078a05b03Eb469e', // ETH/FTM"
  '0x477A71A9154050DFbC497B9F782CC5169f7BDDf5', // fUSDT/FTM"
  '0xc43a1555554FF87f957c0DD5B80ab54951265c2E', // DAI/FTM"
  '0xf4987eE98881ded997D1F3389B82ADF99e6592ed', // MIM/FTM"
  '0x3F576a5a3eb52e658bc88c23d8478Ac67eC90aeE', // FRAX/FTM"
  '0x3Ce75C35AF2DD29D76C7C8521c218c5A0f2826A8', // BIFI/FTM"
  '0x71943a80a81c64235fC45DE4BD06638556fC773E', // fUSDT/USDC"
  '0x3beFeA69e89931b70B80231389F97A9bF6827B2E', // DAI/USDC"
  '0x62A8bB540e52eDfFa5F71B9Ad6BEF52600A1e247', // MIM/USDC"
  '0xDcBd61032cF40C16f6d7B124676C89a0e2e874c4', // FRAX/USDC"
  '0xBb07eBA448e404B56Ba1273B762d690A57F7f84f', // MAI/USDC"
  '0x5bC0F62BfBAc6C5f977BaC73EdC8FbCED89Ba8EC', // BUSD/USDC"
  '0x4423Ca3dB49914c13068C484F9D341D636A515dd', // sFTMX/FTM"
  '0x22214b00318300e0D046feD2D9CB166cBb48Ba60', // alUSD/USDC"
  '0xA8E6F303092F0c345eEc9f780d72A8Bf56C54DF0', // gALCX/FTM"
  '0x04C4244F6b497343e2CcD6f3fE992910c8557dCE', // COMB/FTM"
  '0x46F8546E33900CcdB5D5FBE80af2449ecAe42128', // FXS/FTM"
  '0xD75d45215a5E8E484F1f094f15b2f626A953456e', // TAROT/FTM"
  '0x9757fd7d3B6281218E11Bab3b550eab8C4eF5eA9', // RING/FTM"
  '0xa0AC54644dfCE40F83F3B1BC941c234532B4B8e1', // CRE8R/FTM"
  '0x763caa35565d457AD4231E089C3E8fb3d0fa3d56', // WPGUNK/FTM
  '0xf2c00E3ee1c67aAD4169bD041aFd3B7ff98b2775', // wBOMB/FTM
  '0x57B57A9a34de8547EC4a26b4bded6e78c92C9A76', // USDC/BOO
  '0x948dbcf4595366297E5F2c1baD1593dBBDe875C6', // FTM/gALCX
  '0x1c9c9d2A73A07F2cbAaa7C086a2DA70f155667d6', // USDC/MAI
  '0x0f45B4A89AAb28f4C4dC2d08ebAD277983d4B67a', // LQDR/FTM
  '0x0BF91d2e547A07A41d48817bDD28cb331227d945', // MATIC/FTM
  '0x762C8112207820d60FbB9894D429A60c570Ab574', // TOR/FTM
  '0xD354908d297ce9a348b417d2e0F561EE7D11de5E', // wsHEC/FTM
]

const LQDR: Contract = {
  chain: 'fantom',
  address: '0x10b620b2dbac4faa7d7ffd71da486f5d44cd86f9',
  decimals: 18,
  symbol: 'LQDR',
}

const masterChefv1: Contract = {
  chain: 'fantom',
  address: '0x742474dae70fa2ab063ab786b1fbe5704e861a0c',
}

const masterChefv2: Contract = {
  chain: 'fantom',
  address: '0x6e2ad6527901c9664f016466b8DA1357a004db0f',
}

const locker: Contract = {
  chain: 'fantom',
  address: '0x3ae658656d1c526144db371faef2fff7170654ee',
}

export const getContracts = async (ctx: BaseContext) => {
  const [shadowChefs, pools_v1, pools_v2] = await Promise.all([
    getShadowChefContracts(ctx, shadowChefAddresses),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChefv1.address }),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChefv2.address, getPoolInfos: getLQDRPoolsInfos }),
  ])

  return {
    contracts: { shadowChefs, pools_v1, pools_v2, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    shadowChefs: getLiquidDriverShadowBalances,
    locker: (...args) => getSingleLockerBalance(...args, LQDR, 'locked'),
    pools_v1: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChefv1.address,
        rewardToken: LQDR,
        getUserPendingRewards: getUserPendingLQDR,
        getResolvedUnderlyings: getResolvedLiquidUnderlyings,
      }),
    pools_v2: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChefv2.address,
        rewardToken: LQDR,
        getUserPendingRewards: getUserPendingLQDR,
        getResolvedUnderlyings: getResolvedLiquidUnderlyings,
      }),
  })

  return {
    groups: [{ balances }],
  }
}
